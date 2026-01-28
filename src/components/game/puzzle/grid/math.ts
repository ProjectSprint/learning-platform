import type { GridMetrics, GridSnapConfig } from "./types";

const snapToGrid = (value: number, size: number, offset: number) => {
	if (!Number.isFinite(size) || size <= 0) {
		return value;
	}

	return Math.round((value - offset) / size) * size + offset;
};

export const createGridSnap = ({
	blockWidth,
	blockHeight = blockWidth,
	offsetX = 0,
	offsetY = 0,
}: GridSnapConfig) => ({
	x: (value: number) => snapToGrid(value, blockWidth, offsetX),
	y: (value: number) => snapToGrid(value, blockHeight, offsetY),
});

export const convertPixelToBlock = (
	x: number,
	y: number,
	metrics: GridMetrics,
): { blockX: number; blockY: number } => {
	const { blockWidth, blockHeight, gapX = 0, gapY = 0 } = metrics;
	const cellWidth = blockWidth + gapX;
	const cellHeight = blockHeight + gapY;

	return {
		blockX: Math.floor(x / cellWidth),
		blockY: Math.floor(y / cellHeight),
	};
};

export const convertBlockToPixel = (
	blockX: number,
	blockY: number,
	metrics: GridMetrics,
): { x: number; y: number } => {
	const { blockWidth, blockHeight, gapX = 0, gapY = 0 } = metrics;
	const cellWidth = blockWidth + gapX;
	const cellHeight = blockHeight + gapY;

	return {
		x: blockX * cellWidth,
		y: blockY * cellHeight,
	};
};
