import {
  createMachine,
  Interpreter,
  assign,
  DoneInvokeEvent,
  sendParent,
} from "xstate";

import { metamask } from "lib/blockchain/metamask";
import { ERRORS } from "lib/errors";

import { WishingWellTokens, loadWishingWell } from "./actions/loadWishingWell";
import { collectFromWell } from "./actions/collectFromWell";
import Decimal from "decimal.js-light";
import { getFingerPrint } from "features/game/lib/botDetection";
import { reset } from "features/farming/hud/actions/reset";
import { fromWei } from "web3-utils";
import { loadSession } from "features/game/actions/loadSession";
import { GameState } from "features/game/types/game";

export interface Context {
  state: WishingWellTokens;
  errorCode?: keyof typeof ERRORS;
  farmId?: number;
  sessionId?: string;
  farmAddress?: string;
  token?: string;
  balance?: Decimal;
  totalRewards?: string;
}

type CaptchaEvent = {
  type: "VERIFIED";
  captcha: string;
};

export type BlockchainEvent =
  | {
      type: "WISH";
    }
  | {
      type: "SEND";
    }
  | {
      type: "GRANT_WISH";
    }
  | {
      type: "CLOSING";
    }
  | CaptchaEvent;

export type BlockchainState = {
  value:
    | "loading"
    | "noLiquidity"
    | "canWish"
    | "waiting"
    | "readyToGrant"
    | "wishing"
    | "wished"
    | "captcha"
    | "granting"
    | "searched"
    | "granted"
    | "error";
  context: Context;
};

async function getUpdatedBalance(
  farmId: number,
  sessionId: string,
  token: string,
  currentBalance: Decimal
): Promise<Decimal> {
  await new Promise((res) => setTimeout(res, 3000));

  const response = await loadSession({
    farmId,
    sessionId,
    token,
  });

  const { balance } = response?.game as GameState;

  if (balance.lte(currentBalance)) {
    return getUpdatedBalance(farmId, sessionId, token, currentBalance);
  }

  return balance;
}

export type MachineInterpreter = Interpreter<
  Context,
  any,
  BlockchainEvent,
  BlockchainState
>;

const assignErrorMessage = assign<Context, any>({
  errorCode: (_context, event) => event.data.message,
});

const assignWishingWellState = assign<Context, any>({
  state: (_, event) => event.data.state,
});

const assignTotalRewards = assign<Context, any>({
  totalRewards: (_, event) => event.data.totalRewards,
});

export const wishingWellMachine = createMachine<
  Context,
  BlockchainEvent,
  BlockchainState
>(
  {
    id: "wishingWell",
    initial: "loading",
    context: {
      state: {
        canCollect: false,
        lpTokens: "0",
        myTokensInWell: "0",
        totalTokensInWell: "0",
        lockedTime: "",
        lockedPeriod: 0,
      },
    },
    states: {
      loading: {
        invoke: {
          src: async () => {
            const well = await loadWishingWell();

            return { state: well };
          },
          onDone: [
            {
              target: "noLiquidity",
              actions: assignWishingWellState,
              cond: (_, event: DoneInvokeEvent<Context>) =>
                Number(event.data.state.lpTokens) <= 0,
            },
            {
              target: "canWish",
              actions: assignWishingWellState,
              cond: (_, event: DoneInvokeEvent<Context>) =>
                event.data.state.myTokensInWell === "0",
            },
            {
              target: "waiting",
              actions: assignWishingWellState,
              cond: (_, event: DoneInvokeEvent<Context>) =>
                !!event.data.state.lockedTime,
            },
            {
              target: "readyToGrant",
              actions: assignWishingWellState,
            },
          ],
          onError: {
            target: "error",
          },
        },
      },
      noLiquidity: {},
      canWish: {
        on: {
          WISH: {
            target: "wishing",
          },
        },
      },
      wishing: {
        invoke: {
          src: async () => {
            await metamask.getWishingWell().wish();
          },
          onDone: {
            target: "wished",
          },
          onError: {
            target: "error",
          },
        },
      },
      waiting: {},
      readyToGrant: {
        on: {
          GRANT_WISH: {
            target: "captcha",
          },
        },
      },
      captcha: {
        on: {
          VERIFIED: {
            target: "granting",
          },
        },
      },
      granting: {
        invoke: {
          src: async (context, event) => {
            const receipt: any = await collectFromWell({
              farmId: context.farmId as number,
              sessionId: context.sessionId as string,
              amount: context.state.myTokensInWell.toString(),
              token: context.token as string,
              captcha: (event as CaptchaEvent).captcha,
            });

            const reward = new Decimal(
              fromWei(receipt.events.Rewarded.returnValues[1])
            );

            const fingerprint = await getFingerPrint();

            // Rebase gamestate for player
            await reset({
              farmId: Number(context.farmId),
              token: context.token as string,
              fingerprint: fingerprint,
            });

            // Poll for updated balance
            const updatedBalance = await getUpdatedBalance(
              context.farmId as number,
              context.sessionId as string,
              context.token as string,
              context.balance as Decimal
            );

            const well = await loadWishingWell();

            return {
              state: well,
              totalRewards: reward,
              newBalance: updatedBalance,
            };
          },
          onDone: {
            target: "granted",
            actions: [
              assignWishingWellState,
              assignTotalRewards,
              // Update goblin machine balance
              sendParent((_, event) => ({
                type: "UPDATE_BALANCE",
                newBalance: event.data.newBalance,
              })),
            ],
          },
          onError: {
            target: "error",
            actions: assignErrorMessage,
          },
        },
      },
      wished: {},
      granted: {},
      error: {},
      closed: {
        type: "final",
      },
    },
    on: {
      CLOSING: {
        target: "closed",
      },
    },
  },
  {}
);
