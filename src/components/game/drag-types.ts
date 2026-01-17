export type DragData = {
	itemId: string;
	itemType: string;
	isReposition?: boolean;
	fromBlockX?: number;
	fromBlockY?: number;
};

export type DragSource = "inventory" | "canvas";

export type ActiveDrag = {
	source: DragSource;
	data: DragData;
	element?: HTMLElement | null;
};
