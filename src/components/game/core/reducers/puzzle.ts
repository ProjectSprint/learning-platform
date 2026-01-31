import { updateBlock } from "../../puzzle/grid";
import { findInventoryItem } from "../../validation/inventory";
import { sanitizeDeviceConfig } from "../../validation/sanitize";
import type { GameAction } from "../actions";
import type {
	BoardItemLocation,
	BoardItemStatus,
	GameState,
	PuzzleState,
} from "../types";
import { resolvePuzzleState, updatePuzzleState } from "./puzzle-state";

export const puzzleReducer = (
	state: GameState,
	action: GameAction,
): GameState => {
	switch (action.type) {
		case "PLACE_ITEM": {
			const targetPuzzleId = action.payload.puzzleId;
			const puzzle = resolvePuzzleState(state, targetPuzzleId);
			const { itemId, blockX, blockY } = action.payload;
			const match = findInventoryItem(state.inventory.groups, itemId);
			const item = match?.item;

			if (!item) {
				return state;
			}
			const allowedPlaceKey =
				targetPuzzleId ??
				puzzle.config.puzzleId ??
				puzzle.config.id ??
				"puzzle";
			if (!item.allowedPlaces.includes(allowedPlaceKey)) {
				return state;
			}

			if (!puzzle.blocks[blockY]?.[blockX]) {
				return state;
			}

			if (puzzle.blocks[blockY][blockX].status === "occupied") {
				return state;
			}

			if (
				typeof puzzle.config.maxItems === "number" &&
				puzzle.placedItems.length >= puzzle.config.maxItems
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

			const nextBlocks = updateBlock(puzzle.blocks, blockX, blockY, {
				status: "occupied",
				itemId: item.id,
			});

			const nextPlacedItems = [...puzzle.placedItems, placedItem];
			const nextPuzzle: PuzzleState = {
				...puzzle,
				blocks: nextBlocks,
				placedItems: nextPlacedItems,
			};

			return updatePuzzleState(
				{
					...state,
				},
				targetPuzzleId,
				nextPuzzle,
			);
		}
		case "REMOVE_ITEM": {
			const puzzle = resolvePuzzleState(state, action.payload.puzzleId);
			const { blockX, blockY } = action.payload;
			const block = puzzle.blocks[blockY]?.[blockX];

			if (!block?.itemId) {
				return state;
			}

			const nextBlocks = updateBlock(puzzle.blocks, blockX, blockY, {
				status: "empty",
				itemId: undefined,
			});

			const nextPlacedItems = puzzle.placedItems.filter(
				(item) => item.itemId !== block.itemId,
			);
			const nextPuzzle: PuzzleState = {
				...puzzle,
				blocks: nextBlocks,
				placedItems: nextPlacedItems,
			};

			return updatePuzzleState(
				{
					...state,
				},
				action.payload.puzzleId,
				nextPuzzle,
			);
		}
		case "REPOSITION_ITEM": {
			const puzzle = resolvePuzzleState(state, action.payload.puzzleId);
			const { itemId, fromBlockX, fromBlockY, toBlockX, toBlockY } =
				action.payload;

			if (fromBlockX === toBlockX && fromBlockY === toBlockY) {
				return state;
			}

			const fromBlock = puzzle.blocks[fromBlockY]?.[fromBlockX];
			if (!fromBlock?.itemId || fromBlock.itemId !== itemId) {
				return state;
			}

			const toBlock = puzzle.blocks[toBlockY]?.[toBlockX];
			if (!toBlock) {
				return state;
			}

			if (toBlock.status === "occupied") {
				return state;
			}

			const placedItem = puzzle.placedItems.find((p) => p.itemId === itemId);
			if (!placedItem) {
				return state;
			}

			let nextBlocks = updateBlock(puzzle.blocks, fromBlockX, fromBlockY, {
				status: "empty",
				itemId: undefined,
			});
			nextBlocks = updateBlock(nextBlocks, toBlockX, toBlockY, {
				status: "occupied",
				itemId,
			});

			const nextPlacedItems = puzzle.placedItems.map((item) =>
				item.itemId === itemId
					? { ...item, blockX: toBlockX, blockY: toBlockY }
					: item,
			);

			const nextPuzzle: PuzzleState = {
				...puzzle,
				blocks: nextBlocks,
				placedItems: nextPlacedItems,
			};

			return updatePuzzleState(state, action.payload.puzzleId, nextPuzzle);
		}
		case "TRANSFER_ITEM": {
			const {
				itemId,
				fromPuzzle,
				fromBlockX,
				fromBlockY,
				toPuzzle,
				toBlockX,
				toBlockY,
			} = action.payload;

			if (!state.puzzles) {
				return state;
			}

			if (fromPuzzle === toPuzzle) {
				return state;
			}

			const sourcePuzzle = state.puzzles[fromPuzzle];
			const targetPuzzle = state.puzzles[toPuzzle];
			if (!sourcePuzzle || !targetPuzzle) {
				return state;
			}

			const sourceBlock = sourcePuzzle.blocks[fromBlockY]?.[fromBlockX];
			if (!sourceBlock?.itemId || sourceBlock.itemId !== itemId) {
				return state;
			}

			const targetBlock = targetPuzzle.blocks[toBlockY]?.[toBlockX];
			if (!targetBlock || targetBlock.status === "occupied") {
				return state;
			}

			const movingItem = sourcePuzzle.placedItems.find(
				(item) => item.itemId === itemId,
			);
			if (!movingItem) {
				return state;
			}

			const inventoryMatch = findInventoryItem(state.inventory.groups, itemId);
			if (
				inventoryMatch?.item &&
				!inventoryMatch.item.allowedPlaces.includes(toPuzzle)
			) {
				return state;
			}

			if (
				typeof targetPuzzle.config.maxItems === "number" &&
				targetPuzzle.placedItems.length >= targetPuzzle.config.maxItems
			) {
				return state;
			}

			const nextSourceBlocks = updateBlock(
				sourcePuzzle.blocks,
				fromBlockX,
				fromBlockY,
				{ status: "empty", itemId: undefined },
			);
			const nextSourcePlacedItems = sourcePuzzle.placedItems.filter(
				(item) => item.itemId !== itemId,
			);
			const nextSourcePuzzle: PuzzleState = {
				...sourcePuzzle,
				blocks: nextSourceBlocks,
				placedItems: nextSourcePlacedItems,
			};

			const nextTargetBlocks = updateBlock(
				targetPuzzle.blocks,
				toBlockX,
				toBlockY,
				{ status: "occupied", itemId },
			);
			const nextTargetPlacedItems = [
				...targetPuzzle.placedItems,
				{
					...movingItem,
					blockX: toBlockX,
					blockY: toBlockY,
				},
			];
			const nextTargetPuzzle: PuzzleState = {
				...targetPuzzle,
				blocks: nextTargetBlocks,
				placedItems: nextTargetPlacedItems,
			};

			const nextPuzzles = {
				...state.puzzles,
				[fromPuzzle]: nextSourcePuzzle,
				[toPuzzle]: nextTargetPuzzle,
			};

			let nextPrimaryPuzzle = state.puzzle;
			if (state.puzzle.config.puzzleId === fromPuzzle) {
				nextPrimaryPuzzle = nextSourcePuzzle;
			} else if (state.puzzle.config.puzzleId === toPuzzle) {
				nextPrimaryPuzzle = nextTargetPuzzle;
			}

			return {
				...state,
				puzzle: nextPrimaryPuzzle,
				puzzles: nextPuzzles,
			};
		}
		case "SWAP_ITEMS": {
			const { from, to } = action.payload;

			const resolvePuzzleByKey = (key?: string) => {
				if (!key) {
					return state.puzzle;
				}
				if (state.puzzles?.[key]) {
					return state.puzzles[key];
				}
				if (state.puzzle.config.puzzleId === key) {
					return state.puzzle;
				}
				return undefined;
			};

			const fromPuzzleId = from.puzzleId;
			const toPuzzleId = to.puzzleId;
			const samePuzzle = fromPuzzleId === toPuzzleId;

			const sourcePuzzle = resolvePuzzleByKey(fromPuzzleId);
			const targetPuzzle = resolvePuzzleByKey(toPuzzleId);

			if (!sourcePuzzle || !targetPuzzle) {
				return state;
			}

			const fromBlock = sourcePuzzle.blocks[from.blockY]?.[from.blockX];
			const toBlock = targetPuzzle.blocks[to.blockY]?.[to.blockX];

			if (!fromBlock?.itemId || !toBlock?.itemId) {
				return state;
			}

			if (fromBlock.itemId === toBlock.itemId) {
				return state;
			}

			const fromItem = sourcePuzzle.placedItems.find(
				(item) => item.itemId === fromBlock.itemId,
			);
			const toItem = targetPuzzle.placedItems.find(
				(item) => item.itemId === toBlock.itemId,
			);

			if (!fromItem || !toItem) {
				return state;
			}

			if (samePuzzle || !fromPuzzleId || !toPuzzleId) {
				let nextBlocks = updateBlock(
					sourcePuzzle.blocks,
					from.blockX,
					from.blockY,
					{ itemId: toItem.itemId },
				);
				nextBlocks = updateBlock(nextBlocks, to.blockX, to.blockY, {
					itemId: fromItem.itemId,
				});

				const nextPlacedItems = sourcePuzzle.placedItems.map((item) => {
					if (item.itemId === fromItem.itemId) {
						return { ...item, blockX: to.blockX, blockY: to.blockY };
					}
					if (item.itemId === toItem.itemId) {
						return { ...item, blockX: from.blockX, blockY: from.blockY };
					}
					return item;
				});

				const nextPuzzle: PuzzleState = {
					...sourcePuzzle,
					blocks: nextBlocks,
					placedItems: nextPlacedItems,
				};

				return updatePuzzleState(state, fromPuzzleId, nextPuzzle);
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
					sourcePuzzle.config.puzzleId ?? fromPuzzleId ?? "",
				)
			) {
				return state;
			}

			if (
				fromInvMatch?.item &&
				!fromInvMatch.item.allowedPlaces.includes(
					targetPuzzle.config.puzzleId ?? toPuzzleId ?? "",
				)
			) {
				return state;
			}

			const nextSourceBlocks = updateBlock(
				sourcePuzzle.blocks,
				from.blockX,
				from.blockY,
				{ itemId: toItem.itemId },
			);
			const nextTargetBlocks = updateBlock(
				targetPuzzle.blocks,
				to.blockX,
				to.blockY,
				{ itemId: fromItem.itemId },
			);

			const nextSourcePlacedItems = [
				...sourcePuzzle.placedItems.filter(
					(item) => item.itemId !== fromItem.itemId,
				),
				{ ...toItem, blockX: from.blockX, blockY: from.blockY },
			];
			const nextTargetPlacedItems = [
				...targetPuzzle.placedItems.filter(
					(item) => item.itemId !== toItem.itemId,
				),
				{ ...fromItem, blockX: to.blockX, blockY: to.blockY },
			];

			const nextSourcePuzzle: PuzzleState = {
				...sourcePuzzle,
				blocks: nextSourceBlocks,
				placedItems: nextSourcePlacedItems,
			};
			const nextTargetPuzzle: PuzzleState = {
				...targetPuzzle,
				blocks: nextTargetBlocks,
				placedItems: nextTargetPlacedItems,
			};

			const nextPuzzles = {
				...state.puzzles,
				[fromPuzzleId]: nextSourcePuzzle,
				[toPuzzleId]: nextTargetPuzzle,
			};

			let nextPrimaryPuzzle = state.puzzle;
			if (state.puzzle.config.puzzleId === fromPuzzleId) {
				nextPrimaryPuzzle = nextSourcePuzzle;
			} else if (state.puzzle.config.puzzleId === toPuzzleId) {
				nextPrimaryPuzzle = nextTargetPuzzle;
			}

			return {
				...state,
				puzzle: nextPrimaryPuzzle,
				puzzles: nextPuzzles,
			};
		}
		case "CONFIGURE_DEVICE": {
			const config = sanitizeDeviceConfig(action.payload.config);
			const applyConfig = (puzzle: PuzzleState): PuzzleState | null => {
				const itemIndex = puzzle.placedItems.findIndex(
					(item) => item.id === action.payload.deviceId,
				);

				if (itemIndex === -1) {
					return null;
				}

				const nextPlacedItems = puzzle.placedItems.slice();
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
					...puzzle,
					placedItems: nextPlacedItems,
				};
			};

			if (action.payload.puzzleId) {
				const puzzle = resolvePuzzleState(state, action.payload.puzzleId);
				const nextPuzzle = applyConfig(puzzle);
				if (!nextPuzzle) {
					return state;
				}

				return updatePuzzleState(state, action.payload.puzzleId, nextPuzzle);
			}

			if (state.puzzles) {
				for (const [puzzleId, puzzle] of Object.entries(state.puzzles)) {
					const nextPuzzle = applyConfig(puzzle);
					if (!nextPuzzle) {
						continue;
					}

					return updatePuzzleState(state, puzzleId, nextPuzzle);
				}
			}

			const fallbackPuzzle = applyConfig(state.puzzle);
			if (!fallbackPuzzle) {
				return state;
			}

			return updatePuzzleState(state, action.payload.puzzleId, fallbackPuzzle);
		}
		default:
			return state;
	}
};
