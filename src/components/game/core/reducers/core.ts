import { updateBlock } from "../../puzzle/grid";
import {
	DEFAULT_INVENTORY_GROUP_ID,
	DEFAULT_INVENTORY_TITLE,
	findInventoryItem,
	normalizeInventoryGroups,
} from "../../validation/inventory";
import type { GameAction } from "../actions";
import type {
	BoardItemLocation,
	GameState,
	InventoryGroup,
	PuzzleConfig,
	PuzzleState,
} from "../types";
import { createPuzzleState } from "./puzzle-state";

const defaultPuzzleConfig: PuzzleConfig = {
	id: "default-puzzle",
	size: { base: [6, 4] },
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
	arrows: [],
	terminal: {
		visible: false,
		prompt: "",
		history: [],
	},
	hint: {
		visible: false,
		content: null,
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

const applyInitialPlacements = (
	puzzle: PuzzleState,
	inventoryGroups: InventoryGroup[],
): { puzzle: PuzzleState; inventoryGroups: InventoryGroup[] } => {
	const placements = puzzle.config.initialPlacements ?? [];
	if (placements.length === 0) {
		return { puzzle, inventoryGroups };
	}

	let nextBlocks = puzzle.blocks;
	const nextInventoryGroups = inventoryGroups;
	const placedItems: BoardItemLocation[] = [];
	placements.forEach((placement) => {
		if (!nextBlocks[placement.blockY]?.[placement.blockX]) {
			return;
		}

		if (nextBlocks[placement.blockY][placement.blockX].status === "occupied") {
			return;
		}

		const itemId = placement.itemId;
		const inventoryMatch = findInventoryItem(nextInventoryGroups, itemId);
		const matchedItem = inventoryMatch?.item;

		if (!matchedItem) {
			return;
		}

		placedItems.push({
			id: itemId,
			itemId,
			type: matchedItem.type,
			blockX: placement.blockX,
			blockY: placement.blockY,
			status: placement.status ?? "normal",
			icon: matchedItem?.icon,
			data: placement.data ?? matchedItem?.data ?? {},
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
		case "SET_PHASE":
			return {
				...state,
				phase: action.payload.phase,
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
