import type {
	Block,
	BlockStatus,
	GameState,
	PuzzleConfig,
	PuzzleSize,
	PuzzleSizeValue,
	PuzzleState,
} from "../types";

/**
 * @internal Inlined from legacy puzzle/grid for cleanup
 */
const getMaxPuzzleSize = (size: PuzzleSizeValue): PuzzleSize => {
	if (Array.isArray(size)) {
		return size;
	}
	const values = Object.values(size).filter(Boolean) as PuzzleSize[];
	if (values.length === 0) {
		return [1, 1];
	}
	let maxColumns = 1;
	let maxRows = 1;
	for (const [columns, rows] of values) {
		if (columns > maxColumns) {
			maxColumns = columns;
		}
		if (rows > maxRows) {
			maxRows = rows;
		}
	}
	return [maxColumns, maxRows];
};

/**
 * @internal Inlined from legacy puzzle/grid for cleanup
 */
const createBlockGrid = (columns: number, rows: number): Block[][] =>
	Array.from({ length: rows }, (_, rowIndex) =>
		Array.from({ length: columns }, (_, colIndex) => ({
			x: colIndex,
			y: rowIndex,
			status: "empty" as BlockStatus,
		})),
	);

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
