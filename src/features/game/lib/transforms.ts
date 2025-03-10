import Decimal from "decimal.js-light";
import {
  FieldItem,
  GameState,
  Inventory,
  InventoryItemName,
  LandExpansionRock,
  Rock,
  Tree,
} from "../types/game";

/**
 * Converts API response into a game state
 */
export function makeGame(farm: any): GameState {
  return {
    inventory: Object.keys(farm.inventory).reduce(
      (items, item) => ({
        ...items,
        [item]: new Decimal(farm.inventory[item]),
      }),
      {} as Record<InventoryItemName, Decimal>
    ),
    stock: Object.keys(farm.stock).reduce(
      (items, item) => ({
        ...items,
        [item]: new Decimal(farm.stock[item]),
      }),
      {} as Record<InventoryItemName, Decimal>
    ),
    trees: Object.keys(farm.trees).reduce(
      (items, item) => ({
        ...items,
        [item]: {
          ...farm.trees[item],
          wood: new Decimal(farm.trees[item].wood),
        },
      }),
      {} as Record<number, Tree>
    ),
    stones: Object.keys(farm.stones).reduce(
      (items, item) => ({
        ...items,
        [item]: {
          ...farm.stones[item],
          amount: new Decimal(farm.stones[item].amount),
        },
      }),
      {} as Record<number, Rock>
    ),
    iron: Object.keys(farm.iron).reduce(
      (items, item) => ({
        ...items,
        [item]: {
          ...farm.iron[item],
          amount: new Decimal(farm.iron[item].amount),
        },
      }),
      {} as Record<number, Rock>
    ),
    gold: Object.keys(farm.gold).reduce(
      (items, item) => ({
        ...items,
        [item]: {
          ...farm.gold[item],
          amount: new Decimal(farm.gold[item].amount),
        },
      }),
      {} as Record<number, Rock>
    ),
    chickens: farm.chickens || {},
    stockExpiry: farm.stockExpiry || {},
    skills: {
      farming: new Decimal(farm.skills.farming),
      gathering: new Decimal(farm.skills.gathering),
    },
    balance: new Decimal(farm.balance),
    fields: farm.fields,
    id: farm.id,
    tradeOffer: farm.tradeOffer
      ? {
          ...farm.tradeOffer,
          ingredients: farm.tradeOffer.ingredients.map((ingredient: any) => ({
            ...ingredient,
            amount: new Decimal(ingredient.amount),
          })),
        }
      : undefined,
    tradedAt: farm.tradedAt,
    shrubs: farm.shrubs,
    pebbles: farm.pebbles,
    terrains: farm.terrains,
    plots: farm.plots,
  };
}

type Rocks = Record<number, Rock>;
type Pebbles = Record<number, LandExpansionRock>;

/**
 * Updates a rock with the new amount of mineral inside of it
 */
function updateRocks(oldRocks: Rocks, newRocks: Rocks): Rocks {
  return Object.keys(oldRocks).reduce((rocks, rockId) => {
    const id = Number(rockId);
    const rock = oldRocks[id];
    return {
      ...rocks,
      [id]: {
        ...rock,
        amount: newRocks[id].amount,
      } as Rock,
    };
  }, {} as Record<number, Rock>);
}

/**
 * Merge RNG from server
 */
export function updateGame(
  newGameState: GameState,
  oldGameState: GameState
): GameState {
  if (!newGameState) {
    return oldGameState;
  }

  // Only update random number values generated from the server
  try {
    return {
      ...oldGameState,
      // Update random reward
      fields: Object.keys(oldGameState.fields).reduce((fields, fieldId) => {
        const id = Number(fieldId);
        const field = oldGameState.fields[id];
        return {
          ...fields,
          [id]: {
            ...field,
            reward: newGameState.fields[id].reward,
          },
        };
      }, {} as Record<number, FieldItem>),
      // Update tree with the random amount of wood from the server
      trees: Object.keys(oldGameState.trees).reduce((trees, treeId) => {
        const id = Number(treeId);
        const tree = oldGameState.trees[id];
        return {
          ...trees,
          [id]: {
            ...tree,
            wood: newGameState.trees[id].wood,
          },
        };
      }, {} as Record<number, Tree>),
      stones: updateRocks(oldGameState.stones, newGameState.stones),
      pebbles: newGameState.pebbles,
      iron: updateRocks(oldGameState.iron, newGameState.iron),
      gold: updateRocks(oldGameState.gold, newGameState.gold),
      skills: newGameState.skills,
      chickens: newGameState.chickens,
    };
  } catch (e) {
    console.log({ e });
    return oldGameState;
  }
}

/**
 * Returns the lowest values out of 2 game states
 */
export function getLowestGameState({
  first,
  second,
}: {
  first: GameState;
  second: GameState;
}) {
  const balance = first.balance.lt(second.balance)
    ? first.balance
    : second.balance;

  const items = [
    ...new Set([
      ...(Object.keys(first.inventory) as InventoryItemName[]),
      ...(Object.keys(second.inventory) as InventoryItemName[]),
    ]),
  ];

  const inventory: Inventory = items.reduce((inv, name) => {
    const firstAmount = first.inventory[name] || new Decimal(0);
    const secondAmount = second.inventory[name] || new Decimal(0);

    const amount = firstAmount.lt(secondAmount) ? firstAmount : secondAmount;

    if (amount.eq(0)) {
      return inv;
    }

    return {
      ...inv,
      [name]: amount,
    };
  }, {});

  return {
    balance,
    inventory,
  };
}
