// Block grid creation and manipulation utilities

import type { Block, BlockStatus } from "../../core/types";

export const createBlockGrid = (columns: number, rows: number): Block[][] =>
	Array.from({ length: rows }, (_, rowIndex) =>
		Array.from({ length: columns }, (_, colIndex) => ({
			x: colIndex,
			y: rowIndex,
			status: "empty" as BlockStatus,
		})),
	);

export const updateBlock = (
	blocks: Block[][],
	blockX: number,
	blockY: number,
	updates: Partial<Block>,
): Block[][] => {
	if (!blocks[blockY]?.[blockX]) {
		return blocks;
	}

	const nextBlocks = blocks.slice();
	const nextRow = nextBlocks[blockY].slice();
	nextRow[blockX] = { ...nextRow[blockX], ...updates };
	nextBlocks[blockY] = nextRow;
	return nextBlocks;
};

export const getBlockAt = (
	blocks: Block[][],
	x: number,
	y: number,
): Block | undefined => {
	return blocks[y]?.[x];
};
