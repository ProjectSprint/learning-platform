import type { Dispatch, MutableRefObject, RefObject } from "react";
import { useEffect } from "react";

import type { GameAction } from "../../core/actions";
import type { CanvasState, GameState, PlacedItem } from "../../core/types";
import type {
	ActiveDrag,
	DragData,
	DragDropResult,
	DragHandle,
} from "../../drag";
import { useCanvasDrag } from "../../drag/hooks/use-canvas-drag";
import { useDropZone } from "../../drag/hooks/use-drop-zone";
import type { GridMetrics } from "../../grid";
import type {
	DragPreview,
	ItemClickableCheck,
	PlacedItemClickHandler,
} from "../types";

type UseCanvasInteractionsOptions = {
	activeDrag: ActiveDrag | null;
	canvas: CanvasState;
	resolvedCanvasId: string;
	canvasId?: string;
	state: GameState;
	dispatch: Dispatch<GameAction>;
	canvasRef: RefObject<HTMLDivElement | null>;
	placedItemRefs: RefObject<Map<string, HTMLDivElement>>;
	draggablesRef: RefObject<DragHandle[]>;
	blockWidth: number;
	blockHeight: number;
	stepX: number;
	stepY: number;
	gridMetrics: GridMetrics;
	canPlaceItemAt: (
		data: DragData,
		target: { blockX: number; blockY: number },
		targetCanvasId?: string,
	) => boolean;
	placeOrRepositionItem: (
		data: DragData,
		target: { blockX: number; blockY: number },
	) => boolean;
	getSwapTarget: (
		data: DragData,
		target: { blockX: number; blockY: number },
	) => PlacedItem | null;
	onPlacedItemClick?: PlacedItemClickHandler;
	isItemClickable: ItemClickableCheck;
	setActiveDrag: (drag: ActiveDrag | null) => void;
	setLastDropResult: (result: DragDropResult) => void;
	setDragPreview: (preview: DragPreview | null) => void;
	setHoveredBlock: (block: { x: number; y: number } | null) => void;
	setDraggingItemId: (itemId: string | null) => void;
	targetCanvasIdRef: MutableRefObject<string | undefined>;
	proxyRef: RefObject<HTMLDivElement | null>;
};

export const useCanvasInteractions = ({
	activeDrag,
	canvas,
	resolvedCanvasId,
	canvasId,
	state,
	dispatch,
	canvasRef,
	placedItemRefs,
	draggablesRef,
	blockWidth,
	blockHeight,
	stepX,
	stepY,
	gridMetrics,
	canPlaceItemAt,
	placeOrRepositionItem,
	getSwapTarget,
	onPlacedItemClick,
	isItemClickable,
	setActiveDrag,
	setLastDropResult,
	setDragPreview,
	setHoveredBlock,
	setDraggingItemId,
	targetCanvasIdRef,
	proxyRef,
}: UseCanvasInteractionsOptions) => {
	useEffect(() => {
		if (!activeDrag || !canvasRef.current) {
			return;
		}

		const element = canvasRef.current;
		const handlePointerMove = (event: PointerEvent) => {
			const rect = element.getBoundingClientRect();
			const isInside =
				event.clientX >= rect.left &&
				event.clientX <= rect.right &&
				event.clientY >= rect.top &&
				event.clientY <= rect.bottom;

			if (!isInside) {
				return;
			}

			if (targetCanvasIdRef.current !== resolvedCanvasId) {
				targetCanvasIdRef.current = resolvedCanvasId;
			}
		};

		window.addEventListener("pointermove", handlePointerMove);
		return () => window.removeEventListener("pointermove", handlePointerMove);
	}, [activeDrag, resolvedCanvasId, canvasRef, targetCanvasIdRef]);

	useEffect(() => {
		if (activeDrag) {
			return;
		}
		setDragPreview(null);
		setHoveredBlock(null);
	}, [activeDrag, setDragPreview, setHoveredBlock]);

	useCanvasDrag({
		activeDrag,
		canvas,
		resolvedCanvasId,
		canvasId,
		state,
		dispatch,
		canvasRef,
		placedItemRefs,
		draggablesRef,
		blockWidth,
		blockHeight,
		stepX,
		stepY,
		gridMetrics,
		getSwapTarget,
		placeOrRepositionItem,
		onPlacedItemClick,
		isItemClickable,
		setActiveDrag,
		setDragPreview,
		setHoveredBlock,
		setDraggingItemId,
		targetCanvasIdRef,
		proxyRef,
	});

	useDropZone({
		activeDrag,
		resolvedCanvasId,
		canvasRef,
		gridMetrics,
		blockWidth,
		blockHeight,
		stepX,
		stepY,
		columns: canvas.config.columns,
		rows: canvas.config.rows,
		canPlaceItemAt,
		placeOrRepositionItem,
		proxyRef,
		setLastDropResult,
		setActiveDrag,
		setDragPreview,
		setHoveredBlock,
		targetCanvasIdRef,
	});
};
