import { deriveConnectionsFromCables } from "../../puzzle/connections";
import { updateBlock } from "../../puzzle/grid";
import {
	DEFAULT_INVENTORY_GROUP_ID,
	DEFAULT_INVENTORY_TITLE,
	normalizeInventoryGroups,
} from "../../validation/inventory";
import type { GameAction } from "../actions";
import type {
	PuzzleConfig,
	PuzzleState,
	GameState,
	InventoryGroup,
	InventoryItem,
	PlacedItem,
	SharedZoneItem,
} from "../types";
import { createId } from "../utils/ids";
import { createPuzzleState } from "./puzzle-state";

const defaultPuzzleConfig: PuzzleConfig = {
	id: "default-puzzle",
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
	puzzle: createPuzzleState(defaultPuzzleConfig),
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
	puzzles: Record<string, PuzzleState> | undefined,
): { groupIndex: number; itemIndex: number; item: InventoryItem } | null => {
	for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
		const itemIndex = groups[groupIndex].items.findIndex((item) => {
			if (item.type !== itemType) return false;

			const isOnPuzzle = puzzles
				? Object.values(puzzles).some((puzzle) =>
						puzzle.placedItems.some((placed) => placed.itemId === item.id),
					)
				: false;

			return !isOnPuzzle;
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
	puzzle: PuzzleState,
	inventoryGroups: InventoryGroup[],
	allPuzzles: Record<string, PuzzleState> | undefined,
): { puzzle: PuzzleState; inventoryGroups: InventoryGroup[] } => {
	const placements = puzzle.config.initialPlacements ?? [];
	if (placements.length === 0) {
		return { puzzle, inventoryGroups };
	}

	let nextBlocks = puzzle.blocks;
	const nextInventoryGroups = inventoryGroups;
	const placedItems: PlacedItem[] = [];
	const currentPuzzleId = puzzle.config.puzzleId ?? "puzzle";

	placements.forEach((placement) => {
		if (!nextBlocks[placement.blockY]?.[placement.blockX]) {
			return;
		}

		if (nextBlocks[placement.blockY][placement.blockX].status === "occupied") {
			return;
		}

		let itemId = `initial-${placement.itemType}-${placement.blockX}-${placement.blockY}`;
		const puzzlesForLookup = {
			...(allPuzzles ?? {}),
			[currentPuzzleId]: {
				...puzzle,
				placedItems,
			},
		};
		const inventoryMatch = findAvailableItemByType(
			nextInventoryGroups,
			placement.itemType,
			puzzlesForLookup,
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
		puzzle: {
			...puzzle,
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

			const puzzleIds = new Set<string>();
			const normalizedPuzzles: Array<{ key: string; config: PuzzleConfig }> =
				[];
			for (const [entryKey, puzzleConfig] of entries) {
				const resolvedKey = puzzleConfig.puzzleId ?? entryKey;
				if (puzzleIds.has(resolvedKey)) {
					return state;
				}
				puzzleIds.add(resolvedKey);
				normalizedPuzzles.push({ key: resolvedKey, config: puzzleConfig });
			}

			let inventoryGroups = normalizeInventoryGroups(config.inventoryGroups);
			const nextPuzzles: Record<string, PuzzleState> = {};

			for (const entry of normalizedPuzzles) {
				const key = entry.key;
				const puzzleConfig = entry.config;
				const seeded = applyInitialPlacements(
					createPuzzleState(puzzleConfig),
					inventoryGroups,
					nextPuzzles,
				);
				inventoryGroups = seeded.inventoryGroups;
				nextPuzzles[key] = seeded.puzzle;
			}

			const firstKey = normalizedPuzzles[0]?.key;
			if (!firstKey) {
				return state;
			}
			const firstPuzzle = nextPuzzles[firstKey];
			if (!firstPuzzle) {
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
				puzzle: firstPuzzle,
				puzzles: nextPuzzles,
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
				id: createId(),
				key: action.payload.key,
				value: action.payload.value,
				sourcePuzzleId: action.payload.sourcePuzzleId,
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
