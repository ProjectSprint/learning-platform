import type { PlacedItem } from "../core/types";

export type ItemLabelGetter = (itemType: string) => string;
export type StatusMessageGetter = (placedItem: PlacedItem) => string | null;
export type PlacedItemClickHandler = (placedItem: PlacedItem) => void;
export type ItemClickableCheck = (placedItem: PlacedItem) => boolean;

export type DragPreview = {
	itemId: string;
	itemType: string;
	blockX: number;
	blockY: number;
	x: number;
	y: number;
	width: number;
	height: number;
	valid: boolean;
};
