import type { GridSpaceConfig } from "@/components/game/domain/space";
import type { PuzzleConfig, PuzzleSizeValue } from "@/components/game/core/types";
import { getMaxPuzzleSize } from "@/components/game/puzzle/grid";

export const DEFAULT_GRID_METRICS = {
	cellWidth: 64,
	cellHeight: 64,
	gapX: 4,
	gapY: 4,
} as const;

export type GridCanvasLayout = {
	size: PuzzleSizeValue;
	orientation?: PuzzleConfig["orientation"];
};

export type GridCanvasConfig = GridSpaceConfig & {
	layout: GridCanvasLayout;
};

type GridCanvasConfigInput = {
	id: string;
	name?: string;
	size: PuzzleSizeValue;
	orientation?: PuzzleConfig["orientation"];
	maxCapacity?: number;
	metrics?: GridSpaceConfig["metrics"];
	metadata?: GridSpaceConfig["metadata"];
	allowMultiplePerCell?: boolean;
};

export const createGridCanvasConfig = (
	input: GridCanvasConfigInput,
): GridCanvasConfig => {
	const [cols, rows] = getMaxPuzzleSize(input.size);

	return {
		id: input.id,
		name: input.name,
		rows,
		cols,
		metrics: input.metrics ?? DEFAULT_GRID_METRICS,
		maxCapacity: input.maxCapacity,
		allowMultiplePerCell: input.allowMultiplePerCell,
		metadata: input.metadata,
		layout: {
			size: input.size,
			orientation: input.orientation,
		},
	};
};

export const createPuzzleConfigs = <K extends string>(
	configs: Record<K, GridCanvasConfig>,
): Record<K, PuzzleConfig> => {
	const entries = (Object.entries(configs) as Array<[K, GridCanvasConfig]>).map(
		([key, config]) => {
		const puzzleConfig: PuzzleConfig = {
			id: config.id,
			title: config.name,
			puzzleId: config.id,
			size: config.layout.size,
			orientation: config.layout.orientation,
			maxItems: config.maxCapacity,
		};

		return [key, puzzleConfig];
	},
	);

	return Object.fromEntries(entries) as Record<K, PuzzleConfig>;
};
