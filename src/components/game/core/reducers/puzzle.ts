import { findInventoryItem } from "../../domain/validation/inventory";
import { sanitizeDeviceConfig } from "../../domain/validation/sanitize";
import type { GameAction } from "../actions";
import type {
	BoardItemLocation,
	BoardItemStatus,
	GameState,
	SpaceState,
} from "../types";
import { updateBlock } from "./legacy-utils";
import { resolveSpaceState, updateSpaceState } from "./puzzle-state";

export const spaceReducer = (
	state: GameState,
	action: GameAction,
): GameState => {
	switch (action.type) {
		case "PLACE_ITEM": {
			const targetSpaceId = action.payload.spaceId;
			const space = resolveSpaceState(state, targetSpaceId);
			const { itemId, blockX, blockY } = action.payload;
			const match = findInventoryItem(state.inventory.groups, itemId);
			const item = match?.item;

			if (!item) {
				return state;
			}
			const allowedPlaceKey =
				targetSpaceId ?? space.config.spaceId ?? space.config.id ?? "space";
			if (!item.allowedPlaces.includes(allowedPlaceKey)) {
				return state;
			}

			if (!space.blocks[blockY]?.[blockX]) {
				return state;
			}

			if (space.blocks[blockY][blockX].status === "occupied") {
				return state;
			}

			if (
				typeof space.config.maxItems === "number" &&
				space.placedItems.length >= space.config.maxItems
			) {
				return state;
			}

			const placedItem: BoardItemLocation = {
				id: item.id,
				itemId: item.id,
				type: item.type,
				blockX,
				blockY,
				status: "normal",
				icon: item.icon,
				data: item.data ?? {},
			};

			const nextBlocks = updateBlock(space.blocks, blockX, blockY, {
				status: "occupied",
				itemId: item.id,
			});

			const nextPlacedItems = [...space.placedItems, placedItem];
			const nextSpace: SpaceState = {
				...space,
				blocks: nextBlocks,
				placedItems: nextPlacedItems,
			};

			return updateSpaceState(
				{
					...state,
				},
				targetSpaceId,
				nextSpace,
			);
		}
		case "REMOVE_ITEM": {
			const space = resolveSpaceState(state, action.payload.spaceId);
			const { blockX, blockY } = action.payload;
			const block = space.blocks[blockY]?.[blockX];

			if (!block?.itemId) {
				return state;
			}

			const nextBlocks = updateBlock(space.blocks, blockX, blockY, {
				status: "empty",
				itemId: undefined,
			});

			const nextPlacedItems = space.placedItems.filter(
				(item) => item.itemId !== block.itemId,
			);
			const nextSpace: SpaceState = {
				...space,
				blocks: nextBlocks,
				placedItems: nextPlacedItems,
			};

			return updateSpaceState(
				{
					...state,
				},
				action.payload.spaceId,
				nextSpace,
			);
		}
		case "REPOSITION_ITEM": {
			const space = resolveSpaceState(state, action.payload.spaceId);
			const { itemId, fromBlockX, fromBlockY, toBlockX, toBlockY } =
				action.payload;

			if (fromBlockX === toBlockX && fromBlockY === toBlockY) {
				return state;
			}

			const fromBlock = space.blocks[fromBlockY]?.[fromBlockX];
			if (!fromBlock?.itemId || fromBlock.itemId !== itemId) {
				return state;
			}

			const toBlock = space.blocks[toBlockY]?.[toBlockX];
			if (!toBlock) {
				return state;
			}

			if (toBlock.status === "occupied") {
				return state;
			}

			const placedItem = space.placedItems.find((p) => p.itemId === itemId);
			if (!placedItem) {
				return state;
			}

			let nextBlocks = updateBlock(space.blocks, fromBlockX, fromBlockY, {
				status: "empty",
				itemId: undefined,
			});
			nextBlocks = updateBlock(nextBlocks, toBlockX, toBlockY, {
				status: "occupied",
				itemId,
			});

			const nextPlacedItems = space.placedItems.map((item) =>
				item.itemId === itemId
					? { ...item, blockX: toBlockX, blockY: toBlockY }
					: item,
			);

			const nextSpace: SpaceState = {
				...space,
				blocks: nextBlocks,
				placedItems: nextPlacedItems,
			};

			return updateSpaceState(state, action.payload.spaceId, nextSpace);
		}
		case "TRANSFER_ITEM": {
			const {
				itemId,
				fromSpace,
				fromBlockX,
				fromBlockY,
				toSpace,
				toBlockX,
				toBlockY,
			} = action.payload;

			if (!state.spaces) {
				return state;
			}

			if (fromSpace === toSpace) {
				return state;
			}

			const sourceSpace = state.spaces[fromSpace];
			const targetSpace = state.spaces[toSpace];
			if (!sourceSpace || !targetSpace) {
				return state;
			}

			const sourceBlock = sourceSpace.blocks[fromBlockY]?.[fromBlockX];
			if (!sourceBlock?.itemId || sourceBlock.itemId !== itemId) {
				return state;
			}

			const targetBlock = targetSpace.blocks[toBlockY]?.[toBlockX];
			if (!targetBlock || targetBlock.status === "occupied") {
				return state;
			}

			const movingItem = sourceSpace.placedItems.find(
				(item) => item.itemId === itemId,
			);
			if (!movingItem) {
				return state;
			}

			const inventoryMatch = findInventoryItem(state.inventory.groups, itemId);
			if (
				inventoryMatch?.item &&
				!inventoryMatch.item.allowedPlaces.includes(toSpace)
			) {
				return state;
			}

			if (
				typeof targetSpace.config.maxItems === "number" &&
				targetSpace.placedItems.length >= targetSpace.config.maxItems
			) {
				return state;
			}

			const nextSourceBlocks = updateBlock(
				sourceSpace.blocks,
				fromBlockX,
				fromBlockY,
				{ status: "empty", itemId: undefined },
			);
			const nextSourcePlacedItems = sourceSpace.placedItems.filter(
				(item) => item.itemId !== itemId,
			);
			const nextSourceSpace: SpaceState = {
				...sourceSpace,
				blocks: nextSourceBlocks,
				placedItems: nextSourcePlacedItems,
			};

			const nextTargetBlocks = updateBlock(
				targetSpace.blocks,
				toBlockX,
				toBlockY,
				{ status: "occupied", itemId },
			);
			const nextTargetPlacedItems = [
				...targetSpace.placedItems,
				{
					...movingItem,
					blockX: toBlockX,
					blockY: toBlockY,
				},
			];
			const nextTargetSpace: SpaceState = {
				...targetSpace,
				blocks: nextTargetBlocks,
				placedItems: nextTargetPlacedItems,
			};

			const nextSpaces = {
				...state.spaces,
				[fromSpace]: nextSourceSpace,
				[toSpace]: nextTargetSpace,
			};

			let nextPrimarySpace = state.space;
			if (state.space.config.spaceId === fromSpace) {
				nextPrimarySpace = nextSourceSpace;
			} else if (state.space.config.spaceId === toSpace) {
				nextPrimarySpace = nextTargetSpace;
			}

			return {
				...state,
				space: nextPrimarySpace,
				spaces: nextSpaces,
			};
		}
		case "SWAP_ITEMS": {
			const { from, to } = action.payload;

			const resolveSpaceByKey = (key?: string) => {
				if (!key) {
					return state.space;
				}
				if (state.spaces?.[key]) {
					return state.spaces[key];
				}
				if (state.space.config.spaceId === key) {
					return state.space;
				}
				return undefined;
			};

			const fromSpaceId = from.spaceId;
			const toSpaceId = to.spaceId;
			const sameSpace = fromSpaceId === toSpaceId;

			const sourceSpace = resolveSpaceByKey(fromSpaceId);
			const targetSpace = resolveSpaceByKey(toSpaceId);

			if (!sourceSpace || !targetSpace) {
				return state;
			}

			const fromBlock = sourceSpace.blocks[from.blockY]?.[from.blockX];
			const toBlock = targetSpace.blocks[to.blockY]?.[to.blockX];

			if (!fromBlock?.itemId || !toBlock?.itemId) {
				return state;
			}

			if (fromBlock.itemId === toBlock.itemId) {
				return state;
			}

			const fromItem = sourceSpace.placedItems.find(
				(item) => item.itemId === fromBlock.itemId,
			);
			const toItem = targetSpace.placedItems.find(
				(item) => item.itemId === toBlock.itemId,
			);

			if (!fromItem || !toItem) {
				return state;
			}

			if (sameSpace || !fromSpaceId || !toSpaceId) {
				let nextBlocks = updateBlock(
					sourceSpace.blocks,
					from.blockX,
					from.blockY,
					{ itemId: toItem.itemId },
				);
				nextBlocks = updateBlock(nextBlocks, to.blockX, to.blockY, {
					itemId: fromItem.itemId,
				});

				const nextPlacedItems = sourceSpace.placedItems.map((item) => {
					if (item.itemId === fromItem.itemId) {
						return { ...item, blockX: to.blockX, blockY: to.blockY };
					}
					if (item.itemId === toItem.itemId) {
						return { ...item, blockX: from.blockX, blockY: from.blockY };
					}
					return item;
				});

				const nextSpace: SpaceState = {
					...sourceSpace,
					blocks: nextBlocks,
					placedItems: nextPlacedItems,
				};

				return updateSpaceState(state, fromSpaceId, nextSpace);
			}

			const toInvMatch = findInventoryItem(
				state.inventory.groups,
				toItem.itemId,
			);
			const fromInvMatch = findInventoryItem(
				state.inventory.groups,
				fromItem.itemId,
			);

			if (
				toInvMatch?.item &&
				!toInvMatch.item.allowedPlaces.includes(
					sourceSpace.config.spaceId ?? fromSpaceId ?? "",
				)
			) {
				return state;
			}

			if (
				fromInvMatch?.item &&
				!fromInvMatch.item.allowedPlaces.includes(
					targetSpace.config.spaceId ?? toSpaceId ?? "",
				)
			) {
				return state;
			}

			const nextSourceBlocks = updateBlock(
				sourceSpace.blocks,
				from.blockX,
				from.blockY,
				{ itemId: toItem.itemId },
			);
			const nextTargetBlocks = updateBlock(
				targetSpace.blocks,
				to.blockX,
				to.blockY,
				{ itemId: fromItem.itemId },
			);

			const nextSourcePlacedItems = [
				...sourceSpace.placedItems.filter(
					(item) => item.itemId !== fromItem.itemId,
				),
				{ ...toItem, blockX: from.blockX, blockY: from.blockY },
			];
			const nextTargetPlacedItems = [
				...targetSpace.placedItems.filter(
					(item) => item.itemId !== toItem.itemId,
				),
				{ ...fromItem, blockX: to.blockX, blockY: to.blockY },
			];

			const nextSourceSpace: SpaceState = {
				...sourceSpace,
				blocks: nextSourceBlocks,
				placedItems: nextSourcePlacedItems,
			};
			const nextTargetSpace: SpaceState = {
				...targetSpace,
				blocks: nextTargetBlocks,
				placedItems: nextTargetPlacedItems,
			};

			const nextSpaces = {
				...state.spaces,
				[fromSpaceId]: nextSourceSpace,
				[toSpaceId]: nextTargetSpace,
			};

			let nextPrimarySpace = state.space;
			if (state.space.config.spaceId === fromSpaceId) {
				nextPrimarySpace = nextSourceSpace;
			} else if (state.space.config.spaceId === toSpaceId) {
				nextPrimarySpace = nextTargetSpace;
			}

			return {
				...state,
				space: nextPrimarySpace,
				spaces: nextSpaces,
			};
		}
		case "CONFIGURE_DEVICE": {
			const config = sanitizeDeviceConfig(action.payload.config);
			const applyConfig = (space: SpaceState): SpaceState | null => {
				const itemIndex = space.placedItems.findIndex(
					(item) => item.id === action.payload.deviceId,
				);

				if (itemIndex === -1) {
					return null;
				}

				const nextPlacedItems = space.placedItems.slice();
				const currentItem = nextPlacedItems[itemIndex];

				const newStatus =
					typeof config.status === "string" ? config.status : undefined;
				const { status: _, ...dataConfig } = config;

				nextPlacedItems[itemIndex] = {
					...currentItem,
					...(newStatus && { status: newStatus as BoardItemStatus }),
					data: {
						...currentItem.data,
						...dataConfig,
					},
				};

				return {
					...space,
					placedItems: nextPlacedItems,
				};
			};

			if (action.payload.spaceId) {
				const space = resolveSpaceState(state, action.payload.spaceId);
				const nextSpace = applyConfig(space);
				if (!nextSpace) {
					return state;
				}

				return updateSpaceState(state, action.payload.spaceId, nextSpace);
			}

			if (state.spaces) {
				for (const [spaceId, space] of Object.entries(state.spaces)) {
					const nextSpace = applyConfig(space);
					if (!nextSpace) {
						continue;
					}

					return updateSpaceState(state, spaceId, nextSpace);
				}
			}

			const fallbackSpace = applyConfig(state.space);
			if (!fallbackSpace) {
				return state;
			}

			return updateSpaceState(state, action.payload.spaceId, fallbackSpace);
		}
		default:
			return state;
	}
};
