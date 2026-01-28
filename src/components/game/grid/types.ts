export type GridCoordinate = {
	blockX: number;
	blockY: number;
};

export type GridMetrics = {
	blockWidth: number;
	blockHeight: number;
	gapX?: number;
	gapY?: number;
};

export type GridSnapConfig = {
	blockWidth: number;
	blockHeight?: number;
	offsetX?: number;
	offsetY?: number;
};
