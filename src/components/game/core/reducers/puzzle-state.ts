import { createBlockGrid } from "../../puzzle/grid";
import type { PuzzleConfig, PuzzleState, GameState } from "../types";

export const createPuzzleState = (config: PuzzleConfig): PuzzleState => ({
	config,
	blocks: createBlockGrid(config.columns, config.rows),
	placedItems: [],
	connections: [],
	selectedBlock: null,
});

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
