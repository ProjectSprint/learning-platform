import { deriveConnectionsFromCables } from "../../connections";
import { updateBlock } from "../../grid";
import {
	normalizeInventory,
	normalizeInventoryGroup,
} from "../../validation/inventory";
import type { GameAction } from "../actions";
import type {
	CanvasState,
	GameState,
	InventoryGroup,
	InventoryItem,
} from "../types";

const removeInventoryItems = (
	groups: InventoryGroup[],
	itemIds: Set<string>,
): InventoryGroup[] =>
	groups.map((group) => ({
		...group,
		items: group.items.filter((item) => !itemIds.has(item.id)),
	}));

const removeItemsFromCanvas = (
	canvas: CanvasState,
	itemIds: Set<string>,
): CanvasState => {
	const removedItems = canvas.placedItems.filter((item) =>
		itemIds.has(item.itemId),
	);
	if (removedItems.length === 0) {
		return canvas;
	}

	let nextBlocks = canvas.blocks;
	for (const item of removedItems) {
		nextBlocks = updateBlock(nextBlocks, item.blockX, item.blockY, {
			status: "empty",
			itemId: undefined,
		});
	}

	const nextPlacedItems = canvas.placedItems.filter(
		(item) => !itemIds.has(item.itemId),
	);

	return {
		...canvas,
		blocks: nextBlocks,
		placedItems: nextPlacedItems,
		connections: deriveConnectionsFromCables(nextPlacedItems),
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

			let nextItems: InventoryItem[] | undefined;
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
		case "PURGE_ITEMS": {
			const itemIds = new Set(action.payload.itemIds);
			if (itemIds.size === 0) {
				return state;
			}

			const nextInventoryGroups = removeInventoryItems(
				state.inventory.groups,
				itemIds,
			);

			let nextCanvas = removeItemsFromCanvas(state.canvas, itemIds);
			let nextCanvases = state.canvases;
			if (state.canvases) {
				nextCanvases = Object.fromEntries(
					Object.entries(state.canvases).map(([key, canvas]) => [
						key,
						removeItemsFromCanvas(canvas, itemIds),
					]),
				);

				const primaryCanvasId = state.canvas.config.canvasId;
				if (primaryCanvasId && nextCanvases[primaryCanvasId]) {
					nextCanvas = nextCanvases[primaryCanvasId];
				}
			}

			const resolveCanvas = (key: string) =>
				nextCanvases?.[key] ??
				(nextCanvas.config.canvasId === key ? nextCanvas : undefined);

			const nextCrossConnections = state.crossConnections.filter(
				(connection) => {
					const fromCanvas = resolveCanvas(connection.from.canvasId);
					const toCanvas = resolveCanvas(connection.to.canvasId);
					if (!fromCanvas || !toCanvas) {
						return false;
					}
					const fromBlock =
						fromCanvas.blocks[connection.from.y]?.[connection.from.x];
					const toBlock = toCanvas.blocks[connection.to.y]?.[connection.to.x];
					return Boolean(fromBlock?.itemId && toBlock?.itemId);
				},
			);

			return {
				...state,
				canvas: nextCanvas,
				canvases: nextCanvases,
				crossConnections: nextCrossConnections,
				inventory: { groups: nextInventoryGroups },
			};
		}
		default:
			return state;
	}
};
