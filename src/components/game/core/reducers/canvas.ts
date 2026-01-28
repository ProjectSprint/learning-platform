import { deriveConnectionsFromCables } from "../../connections";
import { updateBlock } from "../../grid";
import { findInventoryItem } from "../../validation/inventory";
import { sanitizeDeviceConfig } from "../../validation/sanitize";
import type { GameAction } from "../actions";
import type {
	CanvasState,
	GameState,
	PlacedItem,
	PlacedItemStatus,
} from "../types";
import { resolveCanvasState, updateCanvasState } from "./canvas-state";

export const canvasReducer = (
	state: GameState,
	action: GameAction,
): GameState => {
	switch (action.type) {
		case "PLACE_ITEM": {
			const targetCanvasId = action.payload.canvasId;
			const canvas = resolveCanvasState(state, targetCanvasId);
			const { itemId, blockX, blockY } = action.payload;
			const match = findInventoryItem(state.inventory.groups, itemId);
			const item = match?.item;

			if (!item) {
				return state;
			}
			const allowedPlaceKey =
				targetCanvasId ??
				canvas.config.canvasId ??
				canvas.config.id ??
				"canvas";
			if (!item.allowedPlaces.includes(allowedPlaceKey)) {
				return state;
			}

			if (!canvas.blocks[blockY]?.[blockX]) {
				return state;
			}

			if (canvas.blocks[blockY][blockX].status === "occupied") {
				return state;
			}

			if (
				typeof canvas.config.maxItems === "number" &&
				canvas.placedItems.length >= canvas.config.maxItems
			) {
				return state;
			}

			const placedItem: PlacedItem = {
				id: item.id,
				itemId: item.id,
				type: item.type,
				blockX,
				blockY,
				status: "normal",
				icon: item.icon,
				behavior: item.behavior,
				data: item.data ?? {},
			};

			const nextBlocks = updateBlock(canvas.blocks, blockX, blockY, {
				status: "occupied",
				itemId: item.id,
			});

			const nextPlacedItems = [...canvas.placedItems, placedItem];
			const nextCanvas: CanvasState = {
				...canvas,
				blocks: nextBlocks,
				placedItems: nextPlacedItems,
				connections: deriveConnectionsFromCables(nextPlacedItems),
			};

			return updateCanvasState(
				{
					...state,
				},
				targetCanvasId,
				nextCanvas,
			);
		}
		case "REMOVE_ITEM": {
			const canvas = resolveCanvasState(state, action.payload.canvasId);
			const { blockX, blockY } = action.payload;
			const block = canvas.blocks[blockY]?.[blockX];

			if (!block?.itemId) {
				return state;
			}

			const nextBlocks = updateBlock(canvas.blocks, blockX, blockY, {
				status: "empty",
				itemId: undefined,
			});

			const nextPlacedItems = canvas.placedItems.filter(
				(item) => item.itemId !== block.itemId,
			);
			const nextConnections = deriveConnectionsFromCables(nextPlacedItems);

			const nextCanvas: CanvasState = {
				...canvas,
				blocks: nextBlocks,
				placedItems: nextPlacedItems,
				connections: nextConnections,
			};

			return updateCanvasState(
				{
					...state,
				},
				action.payload.canvasId,
				nextCanvas,
			);
		}
		case "REPOSITION_ITEM": {
			const canvas = resolveCanvasState(state, action.payload.canvasId);
			const { itemId, fromBlockX, fromBlockY, toBlockX, toBlockY } =
				action.payload;

			if (fromBlockX === toBlockX && fromBlockY === toBlockY) {
				return state;
			}

			const fromBlock = canvas.blocks[fromBlockY]?.[fromBlockX];
			if (!fromBlock?.itemId || fromBlock.itemId !== itemId) {
				return state;
			}

			const toBlock = canvas.blocks[toBlockY]?.[toBlockX];
			if (!toBlock) {
				return state;
			}

			if (toBlock.status === "occupied") {
				return state;
			}

			const placedItem = canvas.placedItems.find((p) => p.itemId === itemId);
			if (!placedItem) {
				return state;
			}

			let nextBlocks = updateBlock(canvas.blocks, fromBlockX, fromBlockY, {
				status: "empty",
				itemId: undefined,
			});
			nextBlocks = updateBlock(nextBlocks, toBlockX, toBlockY, {
				status: "occupied",
				itemId,
			});

			const nextPlacedItems = canvas.placedItems.map((item) =>
				item.itemId === itemId
					? { ...item, blockX: toBlockX, blockY: toBlockY }
					: item,
			);

			const nextCanvas: CanvasState = {
				...canvas,
				blocks: nextBlocks,
				placedItems: nextPlacedItems,
				connections: deriveConnectionsFromCables(nextPlacedItems),
			};

			return updateCanvasState(state, action.payload.canvasId, nextCanvas);
		}
		case "TRANSFER_ITEM": {
			const {
				itemId,
				fromCanvas,
				fromBlockX,
				fromBlockY,
				toCanvas,
				toBlockX,
				toBlockY,
			} = action.payload;

			if (!state.canvases) {
				return state;
			}

			if (fromCanvas === toCanvas) {
				return state;
			}

			const sourceCanvas = state.canvases[fromCanvas];
			const targetCanvas = state.canvases[toCanvas];
			if (!sourceCanvas || !targetCanvas) {
				return state;
			}

			const sourceBlock = sourceCanvas.blocks[fromBlockY]?.[fromBlockX];
			if (!sourceBlock?.itemId || sourceBlock.itemId !== itemId) {
				return state;
			}

			const targetBlock = targetCanvas.blocks[toBlockY]?.[toBlockX];
			if (!targetBlock || targetBlock.status === "occupied") {
				return state;
			}

			const movingItem = sourceCanvas.placedItems.find(
				(item) => item.itemId === itemId,
			);
			if (!movingItem) {
				return state;
			}

			const inventoryMatch = findInventoryItem(state.inventory.groups, itemId);
			if (
				inventoryMatch?.item &&
				!inventoryMatch.item.allowedPlaces.includes(toCanvas)
			) {
				return state;
			}

			if (
				typeof targetCanvas.config.maxItems === "number" &&
				targetCanvas.placedItems.length >= targetCanvas.config.maxItems
			) {
				return state;
			}

			const nextSourceBlocks = updateBlock(
				sourceCanvas.blocks,
				fromBlockX,
				fromBlockY,
				{ status: "empty", itemId: undefined },
			);
			const nextSourcePlacedItems = sourceCanvas.placedItems.filter(
				(item) => item.itemId !== itemId,
			);
			const nextSourceConnections = deriveConnectionsFromCables(
				nextSourcePlacedItems,
			);
			const nextSourceCanvas: CanvasState = {
				...sourceCanvas,
				blocks: nextSourceBlocks,
				placedItems: nextSourcePlacedItems,
				connections: nextSourceConnections,
			};

			const nextTargetBlocks = updateBlock(
				targetCanvas.blocks,
				toBlockX,
				toBlockY,
				{ status: "occupied", itemId },
			);
			const nextTargetPlacedItems = [
				...targetCanvas.placedItems,
				{
					...movingItem,
					blockX: toBlockX,
					blockY: toBlockY,
				},
			];
			const nextTargetConnections = deriveConnectionsFromCables(
				nextTargetPlacedItems,
			);
			const nextTargetCanvas: CanvasState = {
				...targetCanvas,
				blocks: nextTargetBlocks,
				placedItems: nextTargetPlacedItems,
				connections: nextTargetConnections,
			};

			const nextCrossConnections = state.crossConnections.filter(
				(connection) => {
					const fromMatch =
						connection.from.canvasId === fromCanvas &&
						connection.from.x === fromBlockX &&
						connection.from.y === fromBlockY;
					const toMatch =
						connection.to.canvasId === fromCanvas &&
						connection.to.x === fromBlockX &&
						connection.to.y === fromBlockY;
					return !fromMatch && !toMatch;
				},
			);

			const nextCanvases = {
				...state.canvases,
				[fromCanvas]: nextSourceCanvas,
				[toCanvas]: nextTargetCanvas,
			};

			let nextPrimaryCanvas = state.canvas;
			if (state.canvas.config.canvasId === fromCanvas) {
				nextPrimaryCanvas = nextSourceCanvas;
			} else if (state.canvas.config.canvasId === toCanvas) {
				nextPrimaryCanvas = nextTargetCanvas;
			}

			return {
				...state,
				canvas: nextPrimaryCanvas,
				canvases: nextCanvases,
				crossConnections: nextCrossConnections,
			};
		}
		case "SWAP_ITEMS": {
			const { from, to } = action.payload;

			const resolveCanvasByKey = (key?: string) => {
				if (!key) {
					return state.canvas;
				}
				if (state.canvases?.[key]) {
					return state.canvases[key];
				}
				if (state.canvas.config.canvasId === key) {
					return state.canvas;
				}
				return undefined;
			};

			const fromCanvasId = from.canvasId;
			const toCanvasId = to.canvasId;
			const sameCanvas = fromCanvasId === toCanvasId;

			const sourceCanvas = resolveCanvasByKey(fromCanvasId);
			const targetCanvas = resolveCanvasByKey(toCanvasId);

			if (!sourceCanvas || !targetCanvas) {
				return state;
			}

			const fromBlock = sourceCanvas.blocks[from.blockY]?.[from.blockX];
			const toBlock = targetCanvas.blocks[to.blockY]?.[to.blockX];

			if (!fromBlock?.itemId || !toBlock?.itemId) {
				return state;
			}

			if (fromBlock.itemId === toBlock.itemId) {
				return state;
			}

			const fromItem = sourceCanvas.placedItems.find(
				(item) => item.itemId === fromBlock.itemId,
			);
			const toItem = targetCanvas.placedItems.find(
				(item) => item.itemId === toBlock.itemId,
			);

			if (!fromItem || !toItem) {
				return state;
			}

			if (sameCanvas || !fromCanvasId || !toCanvasId) {
				let nextBlocks = updateBlock(
					sourceCanvas.blocks,
					from.blockX,
					from.blockY,
					{ itemId: toItem.itemId },
				);
				nextBlocks = updateBlock(nextBlocks, to.blockX, to.blockY, {
					itemId: fromItem.itemId,
				});

				const nextPlacedItems = sourceCanvas.placedItems.map((item) => {
					if (item.itemId === fromItem.itemId) {
						return { ...item, blockX: to.blockX, blockY: to.blockY };
					}
					if (item.itemId === toItem.itemId) {
						return { ...item, blockX: from.blockX, blockY: from.blockY };
					}
					return item;
				});

				const nextCanvas: CanvasState = {
					...sourceCanvas,
					blocks: nextBlocks,
					placedItems: nextPlacedItems,
					connections: deriveConnectionsFromCables(nextPlacedItems),
				};

				return updateCanvasState(state, fromCanvasId, nextCanvas);
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
					sourceCanvas.config.canvasId ?? fromCanvasId ?? "",
				)
			) {
				return state;
			}

			if (
				fromInvMatch?.item &&
				!fromInvMatch.item.allowedPlaces.includes(
					targetCanvas.config.canvasId ?? toCanvasId ?? "",
				)
			) {
				return state;
			}

			const nextSourceBlocks = updateBlock(
				sourceCanvas.blocks,
				from.blockX,
				from.blockY,
				{ itemId: toItem.itemId },
			);
			const nextTargetBlocks = updateBlock(
				targetCanvas.blocks,
				to.blockX,
				to.blockY,
				{ itemId: fromItem.itemId },
			);

			const nextSourcePlacedItems = [
				...sourceCanvas.placedItems.filter(
					(item) => item.itemId !== fromItem.itemId,
				),
				{ ...toItem, blockX: from.blockX, blockY: from.blockY },
			];
			const nextTargetPlacedItems = [
				...targetCanvas.placedItems.filter(
					(item) => item.itemId !== toItem.itemId,
				),
				{ ...fromItem, blockX: to.blockX, blockY: to.blockY },
			];

			const nextSourceCanvas: CanvasState = {
				...sourceCanvas,
				blocks: nextSourceBlocks,
				placedItems: nextSourcePlacedItems,
				connections: deriveConnectionsFromCables(nextSourcePlacedItems),
			};
			const nextTargetCanvas: CanvasState = {
				...targetCanvas,
				blocks: nextTargetBlocks,
				placedItems: nextTargetPlacedItems,
				connections: deriveConnectionsFromCables(nextTargetPlacedItems),
			};

			const nextCanvases = {
				...state.canvases,
				[fromCanvasId]: nextSourceCanvas,
				[toCanvasId]: nextTargetCanvas,
			};

			let nextPrimaryCanvas = state.canvas;
			if (state.canvas.config.canvasId === fromCanvasId) {
				nextPrimaryCanvas = nextSourceCanvas;
			} else if (state.canvas.config.canvasId === toCanvasId) {
				nextPrimaryCanvas = nextTargetCanvas;
			}

			return {
				...state,
				canvas: nextPrimaryCanvas,
				canvases: nextCanvases,
			};
		}
		case "CONFIGURE_DEVICE": {
			const config = sanitizeDeviceConfig(action.payload.config);
			const applyConfig = (canvas: CanvasState): CanvasState | null => {
				const itemIndex = canvas.placedItems.findIndex(
					(item) => item.id === action.payload.deviceId,
				);

				if (itemIndex === -1) {
					return null;
				}

				const nextPlacedItems = canvas.placedItems.slice();
				const currentItem = nextPlacedItems[itemIndex];

				const newStatus =
					typeof config.status === "string" ? config.status : undefined;
				const { status: _, ...dataConfig } = config;

				nextPlacedItems[itemIndex] = {
					...currentItem,
					...(newStatus && { status: newStatus as PlacedItemStatus }),
					data: {
						...currentItem.data,
						...dataConfig,
					},
				};

				return {
					...canvas,
					placedItems: nextPlacedItems,
				};
			};

			if (action.payload.canvasId) {
				const canvas = resolveCanvasState(state, action.payload.canvasId);
				const nextCanvas = applyConfig(canvas);
				if (!nextCanvas) {
					return state;
				}

				return updateCanvasState(state, action.payload.canvasId, nextCanvas);
			}

			if (state.canvases) {
				for (const [canvasId, canvas] of Object.entries(state.canvases)) {
					const nextCanvas = applyConfig(canvas);
					if (!nextCanvas) {
						continue;
					}

					return updateCanvasState(state, canvasId, nextCanvas);
				}
			}

			const fallbackCanvas = applyConfig(state.canvas);
			if (!fallbackCanvas) {
				return state;
			}

			return updateCanvasState(state, action.payload.canvasId, fallbackCanvas);
		}
		default:
			return state;
	}
};
