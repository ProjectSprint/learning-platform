import { gsap } from "gsap";
import type { MutableRefObject, RefObject } from "react";
import { useEffect } from "react";
import type { DragPreview } from "../board/types";
import type { GridMetrics } from "../grid";
import { convertPixelToBlock } from "../grid";
import type { DragDropResult } from "./context";
import type { ActiveDrag, DragData } from "./types";

type UseDropZoneOptions = {
	activeDrag: ActiveDrag | null;
	resolvedPuzzleId: string;
	boardRef: RefObject<HTMLDivElement | null>;
	gridMetrics: GridMetrics;
	blockWidth: number;
	blockHeight: number;
	stepX: number;
	stepY: number;
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
	proxyRef: RefObject<HTMLDivElement | null>;
	setLastDropResult: (result: DragDropResult) => void;
	setActiveDrag: (drag: ActiveDrag | null) => void;
	setDragPreview: (preview: DragPreview | null) => void;
	setHoveredBlock: (block: { x: number; y: number } | null) => void;
	targetPuzzleIdRef: MutableRefObject<string | undefined>;
};

export const useDropZone = ({
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
}: UseDropZoneOptions) => {
	// biome-ignore lint/correctness/useExhaustiveDependencies: targetPuzzleIdRef is a ref and doesn't need to be in deps
	useEffect(() => {
		if (!activeDrag || activeDrag.source !== "inventory" || !boardRef.current) {
			return;
		}

		const boardElement = boardRef.current;
		let lastBlockX: number | null = null;
		let lastBlockY: number | null = null;

		const handlePointerMove = (event: PointerEvent) => {
			const rect = boardElement.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;
			const isInside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;

			if (isInside) {
				targetPuzzleIdRef.current = resolvedPuzzleId;
			}

			if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
				setDragPreview(null);
				setHoveredBlock(null);
				return;
			}

			const { blockX, blockY } = convertPixelToBlock(x, y, gridMetrics);

			if (blockX < 0 || blockY < 0 || blockX >= columns || blockY >= rows) {
				setDragPreview(null);
				setHoveredBlock(null);
				return;
			}

			if (lastBlockX !== blockX || lastBlockY !== blockY) {
				lastBlockX = blockX;
				lastBlockY = blockY;

				const valid = canPlaceItemAt(
					activeDrag.data,
					{ blockX, blockY },
					resolvedPuzzleId,
				);
				setHoveredBlock({ x: blockX, y: blockY });
				setDragPreview({
					itemId: activeDrag.data.itemId,
					itemType: activeDrag.data.itemType,
					blockX,
					blockY,
					x: blockX * stepX,
					y: blockY * stepY,
					width: blockWidth,
					height: blockHeight,
					valid,
				});
			}
		};

		const handlePointerUp = (event: PointerEvent) => {
			const targetPuzzleId = targetPuzzleIdRef.current;
			if (targetPuzzleId && targetPuzzleId !== resolvedPuzzleId) {
				return;
			}

			const rect = boardElement.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;

			const isInsideBoard =
				x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
			const { blockX, blockY } = convertPixelToBlock(x, y, gridMetrics);
			const canPlace =
				isInsideBoard &&
				canPlaceItemAt(activeDrag.data, { blockX, blockY }, resolvedPuzzleId);

			if (canPlace && proxyRef.current) {
				const targetX = rect.left + blockX * stepX;
				const targetY = rect.top + blockY * stepY;

				gsap.to(proxyRef.current, {
					x: targetX,
					y: targetY,
					width: blockWidth,
					height: blockHeight,
					duration: 0.2,
					ease: "power2.out",
					onComplete: () => {
						placeOrRepositionItem(activeDrag.data, { blockX, blockY });
						setLastDropResult({ source: "inventory", placed: true });
						setActiveDrag(null);
						setDragPreview(null);
						setHoveredBlock(null);
						targetPuzzleIdRef.current = undefined;
					},
				});
			} else {
				setLastDropResult({ source: "inventory", placed: false });
				setActiveDrag(null);
				setDragPreview(null);
				setHoveredBlock(null);
				targetPuzzleIdRef.current = undefined;
			}
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [
		activeDrag,
		blockHeight,
		blockWidth,
		resolvedPuzzleId,
		boardRef,
		canPlaceItemAt,
		gridMetrics,
		placeOrRepositionItem,
		proxyRef,
		setActiveDrag,
		setDragPreview,
		setHoveredBlock,
		setLastDropResult,
		stepX,
		stepY,
		columns,
		rows,
	]);
};
