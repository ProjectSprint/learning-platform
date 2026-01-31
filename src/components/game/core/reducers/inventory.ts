import { updateBlock } from "../../puzzle/grid";
import {
	normalizeInventory,
	normalizeInventoryGroup,
} from "../../validation/inventory";
import type { GameAction } from "../actions";
import type { GameState, InventoryGroup, Item, PuzzleState } from "../types";

const removeInventoryItems = (
	groups: InventoryGroup[],
	itemIds: Set<string>,
): InventoryGroup[] =>
	groups.map((group) => ({
		...group,
		items: group.items.filter((item) => !itemIds.has(item.id)),
	}));

const removeItemsFromPuzzle = (
	puzzle: PuzzleState,
	itemIds: Set<string>,
): PuzzleState => {
	const removedItems = puzzle.placedItems.filter((item) =>
		itemIds.has(item.itemId),
	);
	if (removedItems.length === 0) {
		return puzzle;
	}

	let nextBlocks = puzzle.blocks;
	for (const item of removedItems) {
		nextBlocks = updateBlock(nextBlocks, item.blockX, item.blockY, {
			status: "empty",
			itemId: undefined,
		});
	}

	const nextPlacedItems = puzzle.placedItems.filter(
		(item) => !itemIds.has(item.itemId),
	);

	return {
		...puzzle,
		blocks: nextBlocks,
		placedItems: nextPlacedItems,
	};
};

export const inventoryReducer = (
	state: GameState,
	action: GameAction,
): GameState => {
	switch (action.type) {
		case "ADD_INVENTORY_GROUP": {
			const { group } = action.payload;
			if (state.inventory.groups.some((entry) => entry.id === group.id)) {
				return state;
			}

			const usedIds = new Set<string>();
			for (const entry of state.inventory.groups) {
				for (const item of entry.items) {
					usedIds.add(item.id);
				}
			}

			const normalized = normalizeInventoryGroup(group, usedIds);
			if (!normalized) {
				return state;
			}

			return {
				...state,
				inventory: {
					groups: [...state.inventory.groups, normalized],
				},
			};
		}
		case "UPDATE_INVENTORY_GROUP": {
			const { id, title, visible, items } = action.payload;
			const groupIndex = state.inventory.groups.findIndex(
				(entry) => entry.id === id,
			);
			if (groupIndex === -1) {
				return state;
			}

			let nextItems: Item[] | undefined;
			if (Array.isArray(items)) {
				const usedIds = new Set<string>();
				for (const [index, entry] of state.inventory.groups.entries()) {
					if (index === groupIndex) {
						continue;
					}
					for (const item of entry.items) {
						usedIds.add(item.id);
					}
				}
				const normalizedItems = normalizeInventory(items);
				nextItems = normalizedItems.filter((item) => {
					if (usedIds.has(item.id)) {
						return false;
					}
					usedIds.add(item.id);
					return true;
				});
			}

			const nextGroups = state.inventory.groups.map((entry, index) => {
				if (index !== groupIndex) {
					return entry;
				}
				return {
					...entry,
					title:
						typeof title === "string" && title.trim().length > 0
							? title
							: entry.title,
					visible: visible ?? entry.visible,
					items: nextItems ?? entry.items,
				};
			});

			return {
				...state,
				inventory: { groups: nextGroups },
			};
		}
		case "REMOVE_INVENTORY_GROUP": {
			const nextGroups = state.inventory.groups.filter(
				(entry) => entry.id !== action.payload.id,
			);

			return {
				...state,
				inventory: { groups: nextGroups },
			};
		}
		case "UPDATE_ITEM_TOOLTIP": {
			const { itemId, tooltip } = action.payload;
			let updated = false;

			const nextGroups = state.inventory.groups.map((group) => {
				let groupUpdated = false;
				const nextItems = group.items.map((item) => {
					if (item.id !== itemId) {
						return item;
					}
					groupUpdated = true;
					updated = true;
					return {
						...item,
						tooltip: tooltip ?? undefined,
					};
				});

				return groupUpdated ? { ...group, items: nextItems } : group;
			});

			if (!updated) {
				return state;
			}

			return {
				...state,
				inventory: { groups: nextGroups },
			};
		}
		case "PURGE_ITEMS": {
			const itemIds = new Set(action.payload.itemIds);
			if (itemIds.size === 0) {
				return state;
			}

			const nextInventoryGroups = removeInventoryItems(
				state.inventory.groups,
				itemIds,
			);

			let nextPuzzle = removeItemsFromPuzzle(state.puzzle, itemIds);
			let nextPuzzles = state.puzzles;
			if (state.puzzles) {
				nextPuzzles = Object.fromEntries(
					Object.entries(state.puzzles).map(([key, puzzle]) => [
						key,
						removeItemsFromPuzzle(puzzle, itemIds),
					]),
				);

				const primaryPuzzleId = state.puzzle.config.puzzleId;
				if (primaryPuzzleId && nextPuzzles[primaryPuzzleId]) {
					nextPuzzle = nextPuzzles[primaryPuzzleId];
				}
			}

			return {
				...state,
				puzzle: nextPuzzle,
				puzzles: nextPuzzles,
				inventory: { groups: nextInventoryGroups },
			};
		}
		default:
			return state;
	}
};
