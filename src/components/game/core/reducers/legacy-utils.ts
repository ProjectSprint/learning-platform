/**
 * Legacy utility functions inlined from puzzle/grid for backward compatibility.
 * These support the old puzzle/inventory reducers during migration cleanup.
 * @internal These will be removed once legacy reducers are deprecated.
 */

import type { Block } from "../types";

/**
 * Update a single block in a 2D block grid immutably.
 * @internal Inlined from puzzle/grid/blocks.ts
 */
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
