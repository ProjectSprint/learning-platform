import { normalizeConnectionKey } from "../../puzzle/connections";
import { findInventoryItem } from "../../validation/inventory";
import type { GameAction } from "../actions";
import type {
	PuzzleState,
	Connection,
	CrossCanvasConnection,
	GameState,
} from "../types";
import { createId } from "../utils/ids";
import { resolvePuzzleState, updatePuzzleState } from "./puzzle-state";

const isItemOnPuzzle = (
	itemId: string,
	puzzles: Record<string, PuzzleState> | undefined,
): boolean => {
	if (!puzzles) return false;
	return Object.values(puzzles).some((puzzle) =>
		puzzle.placedItems.some((item) => item.itemId === itemId),
	);
};

export const connectionReducer = (
	state: GameState,
	action: GameAction,
): GameState => {
	switch (action.type) {
		case "MAKE_CONNECTION": {
			const puzzle = resolvePuzzleState(state, action.payload.puzzleId);
			const { from, to, cableId } = action.payload;

			if (from.x === to.x && from.y === to.y) {
				return state;
			}

			const fromBlock = puzzle.blocks[from.y]?.[from.x];
			const toBlock = puzzle.blocks[to.y]?.[to.x];

			if (!fromBlock?.itemId || !toBlock?.itemId) {
				return state;
			}

			const connectionKey = normalizeConnectionKey(from, to);
			const exists = puzzle.connections.some(
				(connection) =>
					normalizeConnectionKey(connection.from, connection.to) ===
					connectionKey,
			);

			if (exists) {
				return state;
			}

			if (cableId) {
				const cableItem = findInventoryItem(
					state.inventory.groups,
					cableId,
				)?.item;
				if (!cableItem) {
					return state;
				}
				if (isItemOnPuzzle(cableId, state.puzzles)) {
					return state;
				}
			}

			const connectionId = `connection-${connectionKey}-${cableId ?? "link"}`;
			const nextConnections: Connection[] = [
				...puzzle.connections,
				{
					id: connectionId,
					type: "cable",
					from,
					to,
					cableId,
				},
			];

			const nextPuzzle: PuzzleState = {
				...puzzle,
				connections: nextConnections,
			};

			return updatePuzzleState(
				{
					...state,
				},
				action.payload.puzzleId,
				nextPuzzle,
			);
		}
		case "REMOVE_CONNECTION": {
			const puzzle = resolvePuzzleState(state, action.payload.puzzleId);
			const connection = puzzle.connections.find(
				(entry) => entry.id === action.payload.connectionId,
			);

			if (!connection) {
				return state;
			}

			const nextConnections = puzzle.connections.filter(
				(entry) => entry.id !== action.payload.connectionId,
			);

			const nextPuzzle: PuzzleState = {
				...puzzle,
				connections: nextConnections,
			};

			return updatePuzzleState(
				{
					...state,
				},
				action.payload.puzzleId,
				nextPuzzle,
			);
		}
		case "MAKE_CROSS_CONNECTION": {
			const { from, to, cableId } = action.payload;
			if (!state.puzzles) {
				return state;
			}

			if (from.canvasId === to.canvasId) {
				return state;
			}

			const fromPuzzle = state.puzzles[from.canvasId];
			const toPuzzle = state.puzzles[to.canvasId];
			if (!fromPuzzle || !toPuzzle) {
				return state;
			}

			const fromBlock = fromPuzzle.blocks[from.y]?.[from.x];
			const toBlock = toPuzzle.blocks[to.y]?.[to.x];
			if (!fromBlock?.itemId || !toBlock?.itemId) {
				return state;
			}

			const nextConnection: CrossCanvasConnection = {
				id: createId(),
				type: "cable",
				from,
				to,
				cableId,
			};

			return {
				...state,
				crossConnections: [...state.crossConnections, nextConnection],
			};
		}
		case "REMOVE_CROSS_CONNECTION": {
			const nextConnections = state.crossConnections.filter(
				(connection) => connection.id !== action.payload.connectionId,
			);

			return {
				...state,
				crossConnections: nextConnections,
			};
		}
		default:
			return state;
	}
};
