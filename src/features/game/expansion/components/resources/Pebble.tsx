import React, { useContext, useEffect, useRef, useState } from "react";

import Spritesheet, {
  SpriteSheetInstance,
} from "components/animation/SpriteAnimator";

import sparkSheet from "assets/resources/pebble/pebble_sheet.png";
import dropSheet from "assets/resources/stone/stone_drop.png";
import smallStone from "assets/resources/small_stone.png";

import { GRID_WIDTH_PX } from "features/game/lib/constants";
import { Context } from "features/game/GameProvider";
import { ToastContext } from "features/game/toast/ToastQueueProvider";
import classNames from "classnames";
import { useActor } from "@xstate/react";

import { getTimeLeft } from "lib/utils/time";

import { canMine } from "features/game/events/pebbleStrike";
import { miningAudio, miningFallAudio } from "lib/utils/sfx";
import { HealthBar } from "components/ui/HealthBar";
import { TimeLeftPanel } from "components/ui/TimeLeftPanel";

const POPOVER_TIME_MS = 1000;
const HITS = 2;

// 30 minutes
const PEBBLE_RECOVERY_TIME = 30 * 60;

interface Props {
  pebbleIndex: number;
}

export const Pebble: React.FC<Props> = ({ pebbleIndex }) => {
  const { gameService } = useContext(Context);
  const [game] = useActor(gameService);

  const [showPopover, setShowPopover] = useState(true);
  const [popover, setPopover] = useState<JSX.Element | null>();

  const [touchCount, setTouchCount] = useState(0);
  // When to hide the pebble that pops out
  const [collecting, setCollecting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const sparkGif = useRef<SpriteSheetInstance>();
  const minedGif = useRef<SpriteSheetInstance>();

  const [showPebbleTimeLeft, setShowPebbleTimeLeft] = useState(false);

  const pebble = game.context.state.pebbles[pebbleIndex];
  // Users will need to refresh to chop the tree again
  const mined = !canMine(pebble);
  const { setToast } = useContext(ToastContext);

  // Reset the shake count when clicking outside of the component
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setTouchCount(0);
      }
    };
    document.addEventListener("click", handleClickOutside, true);
    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, []);

  const displayPopover = async (element: JSX.Element) => {
    setPopover(element);
    setShowPopover(true);

    await new Promise((resolve) => setTimeout(resolve, POPOVER_TIME_MS));
    setShowPopover(false);
  };

  // Show/Hide Time left on hover

  const handleMouseHoverPebble = () => {
    if (mined) setShowPebbleTimeLeft(true);
  };

  const handleMouseLeavePebble = () => {
    setShowPebbleTimeLeft(false);
  };

  const strike = () => {
    const isPlaying = sparkGif.current?.getInfo("isPlaying");

    if (!isPlaying) {
      miningAudio.play();

      sparkGif.current?.goToAndPlay(0);

      setTouchCount((count) => count + 1);

      // On second strike, mine
      if (touchCount > 0 && touchCount === HITS - 1) {
        mine();
        miningFallAudio.play();
        setTouchCount(0);
      }
    } else return;
  };

  const mine = async () => {
    setTouchCount(0);

    try {
      gameService.send("pebble.struck", {
        index: pebbleIndex,
      });
      setCollecting(true);
      minedGif.current?.goToAndPlay(0);

      displayPopover(
        <div className="flex">
          <img src={smallStone} className="w-5 h-5 mr-2" />
          <span className="text-sm text-white text-shadow">{`+${pebble.stone.amount}`}</span>
        </div>
      );

      setToast({
        icon: smallStone,
        content: `+${pebble.stone.amount}`,
      });

      await new Promise((res) => setTimeout(res, 2000));
      setCollecting(false);
    } catch (e: any) {
      displayPopover(
        <span className="text-xs text-white text-shadow">{e.message}</span>
      );
    }
  };

  const timeLeft = getTimeLeft(pebble.stone.minedAt, PEBBLE_RECOVERY_TIME);

  return (
    <div
      className="relative z-10"
      onMouseEnter={handleMouseHoverPebble}
      onMouseLeave={handleMouseLeavePebble}
    >
      {!mined && (
        <div
          ref={containerRef}
          className="group cursor-pointer w-full h-full"
          onClick={strike}
        >
          <Spritesheet
            className="group-hover:img-highlight pointer-events-none transform z-10"
            style={{
              width: `${GRID_WIDTH_PX * 4}px`,
              imageRendering: "pixelated",
            }}
            getInstance={(spritesheet) => {
              sparkGif.current = spritesheet;
            }}
            image={sparkSheet}
            widthFrame={48}
            heightFrame={32}
            fps={24}
            steps={6}
            direction={`forward`}
            autoplay={false}
            loop={true}
            onLoopComplete={(spritesheet) => {
              spritesheet.pause();
            }}
          />
        </div>
      )}

      <Spritesheet
        style={{
          width: `${GRID_WIDTH_PX * 4}px`,
          opacity: collecting ? 1 : 0,
          transition: "opacity 0.2s ease-in",
          imageRendering: "pixelated",
        }}
        className="pointer-events-none z-20"
        getInstance={(spritesheet) => {
          minedGif.current = spritesheet;
        }}
        image={dropSheet}
        widthFrame={91}
        heightFrame={66}
        fps={18}
        steps={7}
        direction={`forward`}
        autoplay={false}
        loop={true}
        onLoopComplete={(spritesheet) => {
          spritesheet.pause();
        }}
      />

      {/* Hide the empty Pebble behind  */}
      <img
        src={smallStone}
        className="absolute top-0 pointer-events-none -z-10 opacity-50"
        style={{
          width: `${GRID_WIDTH_PX}px`,
        }}
      />

      <div
        className={classNames(
          "transition-opacity pointer-events-none absolute top-12 left-8",
          {
            "opacity-100": touchCount > 0,
            "opacity-0": touchCount === 0,
          }
        )}
      >
        <HealthBar percentage={collecting ? 0 : 100 - (touchCount / 2) * 100} />
      </div>

      {mined && (
        <div
          className="absolute"
          id="mined-stone"
          style={{
            bottom: "90px",
            left: "-25px",
          }}
        >
          <TimeLeftPanel
            text="Recovers in:"
            timeLeft={timeLeft}
            showTimeLeft={showPebbleTimeLeft}
          />
        </div>
      )}

      <div
        className={classNames(
          "transition-opacity absolute top-24 w-40 left-20 z-20 pointer-events-none",
          {
            "opacity-100": showPopover,
            "opacity-0": !showPopover,
          }
        )}
      >
        {popover}
      </div>
    </div>
  );
};
