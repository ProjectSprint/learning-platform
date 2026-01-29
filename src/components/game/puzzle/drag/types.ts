export type DragData = {
	itemId: string;
	itemType: string;
	itemName?: string;
	isReposition?: boolean;
	fromBlockX?: number;
	fromBlockY?: number;
};

export type DragSource = "inventory" | "board";

export type ActiveDrag = {
	source: DragSource;
	data: DragData;
	sourcePuzzleId?: string;
	element?: HTMLElement | null;
	initialRect?: DOMRect;
	pointerOffset?: { x: number; y: number };
	pointerType?: "mouse" | "touch" | "pen";
};
