import type { Dispatch, MutableRefObject, RefObject } from "react";
import { useEffect } from "react";

import type { GameAction } from "../../core/actions";
import type {
	BoardItemLocation,
	GameState,
	PuzzleState,
} from "../../core/types";
import type { ActiveDrag, DragData, DragDropResult, DragHandle } from "../drag";
import { useBoardDrag } from "../drag/use-board-drag";
import { useDropZone } from "../drag/use-drop-zone";
import type { GridMetrics } from "../grid";
import type {
	DragPreview,
	ItemClickableCheck,
	PlacedItemClickHandler,
} from "./types";

type UseBoardInteractionsOptions = {
	activeDrag: ActiveDrag | null;
	puzzle: PuzzleState;
	resolvedPuzzleId: string;
	puzzleId?: string;
	state: GameState;
	dispatch: Dispatch<GameAction>;
	boardRef: RefObject<HTMLDivElement | null>;
	placedItemRefs: RefObject<Map<string, HTMLDivElement>>;
	draggablesRef: RefObject<DragHandle[]>;
	blockWidth: number;
	blockHeight: number;
	stepX: number;
	stepY: number;
	gridMetrics: GridMetrics;
	columns: number;
	rows: number;
	canPlaceItemAt: (
		data: DragData,
		target: { blockX: number; blockY: number },
		targetPuzzleId?: string,
	) => boolean;
	placeOrRepositionItem: (
		data: DragData,
		target: { blockX: number; blockY: number },
	) => boolean;
	getSwapTarget: (
		data: DragData,
		target: { blockX: number; blockY: number },
	) => BoardItemLocation | null;
	onPlacedItemClick?: PlacedItemClickHandler;
	isItemClickable: ItemClickableCheck;
	setActiveDrag: (drag: ActiveDrag | null) => void;
	setLastDropResult: (result: DragDropResult) => void;
	setDragPreview: (preview: DragPreview | null) => void;
	setHoveredBlock: (block: { x: number; y: number } | null) => void;
	setDraggingItemId: (itemId: string | null) => void;
	targetPuzzleIdRef: MutableRefObject<string | undefined>;
	proxyRef: RefObject<HTMLDivElement | null>;
};

export const useBoardInteractions = ({
	activeDrag,
	puzzle,
	resolvedPuzzleId,
	puzzleId,
	state,
	dispatch,
	boardRef,
	placedItemRefs,
	draggablesRef,
	blockWidth,
	blockHeight,
	stepX,
	stepY,
	gridMetrics,
	columns,
	rows,
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
	targetPuzzleIdRef,
	proxyRef,
}: UseBoardInteractionsOptions) => {
	useEffect(() => {
		if (!activeDrag || !boardRef.current) {
			return;
		}

		const element = boardRef.current;
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

			if (targetPuzzleIdRef.current !== resolvedPuzzleId) {
				targetPuzzleIdRef.current = resolvedPuzzleId;
			}
		};

		window.addEventListener("pointermove", handlePointerMove);
		return () => window.removeEventListener("pointermove", handlePointerMove);
	}, [activeDrag, resolvedPuzzleId, boardRef, targetPuzzleIdRef]);

	useEffect(() => {
		if (activeDrag) {
			return;
		}
		setDragPreview(null);
		setHoveredBlock(null);
	}, [activeDrag, setDragPreview, setHoveredBlock]);

	useBoardDrag({
		activeDrag,
		puzzle,
		resolvedPuzzleId,
		puzzleId,
		state,
		dispatch,
		boardRef,
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
		targetPuzzleIdRef,
		proxyRef,
	});

	useDropZone({
		activeDrag,
		resolvedPuzzleId,
		boardRef,
		gridMetrics,
		blockWidth,
		blockHeight,
		stepX,
		stepY,
		columns,
		rows,
		canPlaceItemAt,
		placeOrRepositionItem,
		proxyRef,
		setLastDropResult,
		setActiveDrag,
		setDragPreview,
		setHoveredBlock,
		targetPuzzleIdRef,
	});
};
