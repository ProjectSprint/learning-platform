import { deriveConnectionsFromCables } from "../../connections";
import { updateBlock } from "../../grid";
import {
	DEFAULT_INVENTORY_GROUP_ID,
	DEFAULT_INVENTORY_TITLE,
	normalizeInventoryGroups,
} from "../../validation/inventory";
import type { GameAction } from "../actions";
import type {
	CanvasConfig,
	CanvasState,
	GameState,
	InventoryGroup,
	InventoryItem,
	PlacedItem,
	SharedZoneItem,
} from "../types";
import { createCanvasState } from "./canvas-state";

const defaultCanvasConfig: CanvasConfig = {
	id: "default-canvas",
	columns: 6,
	rows: 4,
	orientation: "horizontal",
};

export const createDefaultState = (): GameState => ({
	phase: "setup",
	inventory: {
		groups: [
			{
				id: DEFAULT_INVENTORY_GROUP_ID,
				title: DEFAULT_INVENTORY_TITLE,
				visible: true,
				items: [],
			},
		],
	},
	canvas: createCanvasState(defaultCanvasConfig),
	crossConnections: [],
	sharedZone: { items: {} },
	terminal: {
		visible: false,
		prompt: "",
		history: [],
	},
	overlay: {
		activeModal: null,
	},
	question: {
		id: "",
		status: "in_progress",
	},
	sequence: 0,
});

const findAvailableItemByType = (
	groups: InventoryGroup[],
	itemType: string,
	canvases: Record<string, CanvasState> | undefined,
): { groupIndex: number; itemIndex: number; item: InventoryItem } | null => {
	for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
		const itemIndex = groups[groupIndex].items.findIndex((item) => {
			if (item.type !== itemType) return false;

			const isOnCanvas = canvases
				? Object.values(canvases).some((canvas) =>
						canvas.placedItems.some((placed) => placed.itemId === item.id),
					)
				: false;

			return !isOnCanvas;
		});
		if (itemIndex >= 0) {
			return {
				groupIndex,
				itemIndex,
				item: groups[groupIndex].items[itemIndex],
			};
		}
	}
	return null;
};

const applyInitialPlacements = (
	canvas: CanvasState,
	inventoryGroups: InventoryGroup[],
	allCanvases: Record<string, CanvasState> | undefined,
): { canvas: CanvasState; inventoryGroups: InventoryGroup[] } => {
	const placements = canvas.config.initialPlacements ?? [];
	if (placements.length === 0) {
		return { canvas, inventoryGroups };
	}

	let nextBlocks = canvas.blocks;
	const nextInventoryGroups = inventoryGroups;
	const placedItems: PlacedItem[] = [];
	const currentCanvasId = canvas.config.canvasId ?? "canvas";

	placements.forEach((placement) => {
		if (!nextBlocks[placement.blockY]?.[placement.blockX]) {
			return;
		}

		if (nextBlocks[placement.blockY][placement.blockX].status === "occupied") {
			return;
		}

		let itemId = `initial-${placement.itemType}-${placement.blockX}-${placement.blockY}`;
		const canvasesForLookup = {
			...(allCanvases ?? {}),
			[currentCanvasId]: {
				...canvas,
				placedItems,
			},
		};
		const inventoryMatch = findAvailableItemByType(
			nextInventoryGroups,
			placement.itemType,
			canvasesForLookup,
		);
		const matchedItem = inventoryMatch?.item;

		if (inventoryMatch) {
			itemId = inventoryMatch.item.id;
		}

		placedItems.push({
			id: itemId,
			itemId,
			type: placement.itemType,
			blockX: placement.blockX,
			blockY: placement.blockY,
			status: "normal",
			icon: matchedItem?.icon,
			behavior: matchedItem?.behavior,
			data: matchedItem?.data ?? {},
		});

		nextBlocks = updateBlock(nextBlocks, placement.blockX, placement.blockY, {
			status: "occupied",
			itemId,
		});
	});

	return {
		canvas: {
			...canvas,
			blocks: nextBlocks,
			placedItems,
			connections: deriveConnectionsFromCables(placedItems),
		},
		inventoryGroups: nextInventoryGroups,
	};
};

export const coreReducer = (
	state: GameState,
	action: GameAction,
): GameState => {
	switch (action.type) {
		case "INIT_MULTI_CANVAS": {
			const config = action.payload;
			const entries = Object.entries(config.canvases);
			if (entries.length === 0) {
				return state;
			}

			const canvasIds = new Set<string>();
			const normalizedCanvases: Array<{ key: string; config: CanvasConfig }> =
				[];
			for (const [entryKey, canvasConfig] of entries) {
				const resolvedKey = canvasConfig.canvasId ?? entryKey;
				if (canvasIds.has(resolvedKey)) {
					return state;
				}
				canvasIds.add(resolvedKey);
				normalizedCanvases.push({ key: resolvedKey, config: canvasConfig });
			}

			let inventoryGroups = normalizeInventoryGroups(config.inventoryGroups);
			const nextCanvases: Record<string, CanvasState> = {};

			for (const entry of normalizedCanvases) {
				const key = entry.key;
				const canvasConfig = entry.config;
				const seeded = applyInitialPlacements(
					createCanvasState(canvasConfig),
					inventoryGroups,
					nextCanvases,
				);
				inventoryGroups = seeded.inventoryGroups;
				nextCanvases[key] = seeded.canvas;
			}

			const firstKey = normalizedCanvases[0]?.key;
			if (!firstKey) {
				return state;
			}
			const firstCanvas = nextCanvases[firstKey];
			if (!firstCanvas) {
				return state;
			}

			const terminal = {
				...state.terminal,
				...config.terminal,
			};

			return {
				...createDefaultState(),
				phase: config.phase ?? "setup",
				inventory: { groups: inventoryGroups },
				canvas: firstCanvas,
				canvases: nextCanvases,
				terminal: {
					visible: terminal.visible ?? false,
					prompt: terminal.prompt ?? "",
					history: terminal.history ?? [],
				},
				question: {
					id: config.questionId,
					status: config.questionStatus ?? "in_progress",
				},
			};
		}
		case "SET_SHARED_DATA": {
			const nextItem: SharedZoneItem = {
				id: crypto.randomUUID(),
				key: action.payload.key,
				value: action.payload.value,
				sourceCanvasId: action.payload.sourceCanvasId,
				timestamp: Date.now(),
			};

			return {
				...state,
				sharedZone: {
					items: {
						...state.sharedZone.items,
						[action.payload.key]: nextItem,
					},
				},
			};
		}
		case "REMOVE_SHARED_DATA": {
			const nextItems = { ...state.sharedZone.items };
			delete nextItems[action.payload.key];

			return {
				...state,
				sharedZone: {
					items: nextItems,
				},
			};
		}
		case "SET_PHASE":
			return {
				...state,
				phase: action.payload.phase,
				terminal: {
					...state.terminal,
					visible:
						action.payload.phase === "terminal" ||
						action.payload.phase === "completed",
				},
			};
		case "COMPLETE_QUESTION":
			return {
				...state,
				phase: "completed",
				question: { ...state.question, status: "completed" },
			};
		default:
			return state;
	}
};
