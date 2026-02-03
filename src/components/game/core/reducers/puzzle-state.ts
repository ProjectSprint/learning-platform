import type {
	Block,
	BlockStatus,
	GameState,
	SpaceConfig,
	SpaceSize,
	SpaceSizeValue,
	SpaceState,
} from "../types";

/**
 * @internal Inlined from legacy grid for cleanup
 */
const getMaxSpaceSize = (size: SpaceSizeValue): SpaceSize => {
	if (Array.isArray(size)) {
		return size;
	}
	const values = Object.values(size).filter(Boolean) as SpaceSize[];
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
 * @internal Inlined from legacy grid for cleanup
 */
const createBlockGrid = (columns: number, rows: number): Block[][] =>
	Array.from({ length: rows }, (_, rowIndex) =>
		Array.from({ length: columns }, (_, colIndex) => ({
			x: colIndex,
			y: rowIndex,
			status: "empty" as BlockStatus,
		})),
	);

export const createSpaceState = (config: SpaceConfig): SpaceState => {
	const [columns, rows] = getMaxSpaceSize(config.size);
	return {
		config,
		blocks: createBlockGrid(columns, rows),
		placedItems: [],
		selectedBlock: null,
	};
};

export const resolveSpaceState = (state: GameState, spaceId?: string) => {
	if (!spaceId) {
		return state.space;
	}

	return state.spaces?.[spaceId] ?? state.space;
};

export const updateSpaceState = (
	state: GameState,
	spaceId: string | undefined,
	nextSpace: SpaceState,
): GameState => {
	if (!spaceId) {
		return { ...state, space: nextSpace };
	}

	const nextPrimary =
		state.space.config.spaceId === spaceId ? nextSpace : state.space;

	return {
		...state,
		space: nextPrimary,
		spaces: {
			...(state.spaces ?? {}),
			[spaceId]: nextSpace,
		},
	};
};
