export type DragData = {
	itemId: string;
	itemType: string;
	itemName?: string;
	isReposition?: boolean;
	fromBlockX?: number;
	fromBlockY?: number;
};

export type DragSource = "inventory" | "canvas";

export type ActiveDrag = {
	source: DragSource;
	data: DragData;
	sourceCanvasId?: string;
	element?: HTMLElement | null;
	initialRect?: DOMRect;
	pointerOffset?: { x: number; y: number };
};
