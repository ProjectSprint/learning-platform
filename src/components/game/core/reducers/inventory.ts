import {
	normalizeInventory,
	normalizeInventoryGroup,
} from "../../domain/validation/inventory";
import type { GameAction } from "../actions";
import type { GameState, InventoryGroup, Item, SpaceState } from "../types";
import { updateBlock } from "./legacy-utils";

const removeInventoryItems = (
	groups: InventoryGroup[],
	itemIds: Set<string>,
): InventoryGroup[] =>
	groups.map((group) => ({
		...group,
		items: group.items.filter((item) => !itemIds.has(item.id)),
	}));

const removeItemsFromSpace = (
	space: SpaceState,
	itemIds: Set<string>,
): SpaceState => {
	const removedItems = space.placedItems.filter((item) =>
		itemIds.has(item.itemId),
	);
	if (removedItems.length === 0) {
		return space;
	}

	let nextBlocks = space.blocks;
	for (const item of removedItems) {
		nextBlocks = updateBlock(nextBlocks, item.blockX, item.blockY, {
			status: "empty",
			itemId: undefined,
		});
	}

	const nextPlacedItems = space.placedItems.filter(
		(item) => !itemIds.has(item.itemId),
	);

	return {
		...space,
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

			let nextSpace = removeItemsFromSpace(state.space, itemIds);
			let nextSpaces = state.spaces;
			if (state.spaces) {
				nextSpaces = Object.fromEntries(
					Object.entries(state.spaces).map(([key, space]) => [
						key,
						removeItemsFromSpace(space, itemIds),
					]),
				);

				const primarySpaceId = state.space.config.spaceId;
				if (primarySpaceId && nextSpaces[primarySpaceId]) {
					nextSpace = nextSpaces[primarySpaceId];
				}
			}

			return {
				...state,
				space: nextSpace,
				spaces: nextSpaces,
				inventory: { groups: nextInventoryGroups },
			};
		}
		default:
			return state;
	}
};
