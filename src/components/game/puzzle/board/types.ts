import type { BoardItemLocation } from "../../core/types";

export type ItemLabelGetter = (itemType: string) => string;
export type StatusMessageGetter = (
	placedItem: BoardItemLocation,
	puzzleId?: string,
) => string | null;
export type PlacedItemClickHandler = (placedItem: BoardItemLocation) => void;
export type ItemClickableCheck = (placedItem: BoardItemLocation) => boolean;

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
