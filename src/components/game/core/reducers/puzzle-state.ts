import { createBlockGrid, getMaxPuzzleSize } from "../../puzzle/grid";
import type { GameState, PuzzleConfig, PuzzleState } from "../types";

export const createPuzzleState = (config: PuzzleConfig): PuzzleState => {
	const [columns, rows] = getMaxPuzzleSize(config.size);
	return {
		config,
		blocks: createBlockGrid(columns, rows),
		placedItems: [],
		selectedBlock: null,
	};
};

export const resolvePuzzleState = (state: GameState, puzzleId?: string) => {
	if (!puzzleId) {
		return state.puzzle;
	}

	return state.puzzles?.[puzzleId] ?? state.puzzle;
};

export const updatePuzzleState = (
	state: GameState,
	puzzleId: string | undefined,
	nextPuzzle: PuzzleState,
): GameState => {
	if (!puzzleId) {
		return { ...state, puzzle: nextPuzzle };
	}

	const nextPrimary =
		state.puzzle.config.puzzleId === puzzleId ? nextPuzzle : state.puzzle;

	return {
		...state,
		puzzle: nextPrimary,
		puzzles: {
			...(state.puzzles ?? {}),
			[puzzleId]: nextPuzzle,
		},
	};
};
