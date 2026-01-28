import { gsap } from "gsap";
import type { Draggable } from "gsap/Draggable";
import type { Dispatch, MutableRefObject, RefObject } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";
import type {
	DragPreview,
	ItemClickableCheck,
	PlacedItemClickHandler,
} from "../../canvas/types";
import type { GameAction } from "../../core/actions";
import type { CanvasState, GameState, PlacedItem } from "../../core/types";
import type { GridMetrics } from "../../grid";
import { convertPixelToBlock } from "../../grid";
import {
	type ActiveDrag,
	createDraggable,
	type DragData,
	type DragHandle,
	ensureGsapPlugins,
	hitTestAny,
} from "../index";

type UseCanvasDragOptions = {
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
	getSwapTarget: (
		data: DragData,
		target: { blockX: number; blockY: number },
	) => PlacedItem | null;
	placeOrRepositionItem: (
		data: DragData,
		target: { blockX: number; blockY: number },
	) => boolean;
	onPlacedItemClick?: PlacedItemClickHandler;
	isItemClickable: ItemClickableCheck;
	setActiveDrag: (drag: ActiveDrag | null) => void;
	setDragPreview: (preview: DragPreview | null) => void;
	setHoveredBlock: (block: { x: number; y: number } | null) => void;
	setDraggingItemId: (itemId: string | null) => void;
	targetCanvasIdRef: MutableRefObject<string | undefined>;
	proxyRef: RefObject<HTMLDivElement | null>;
};

export const useCanvasDrag = ({
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
}: UseCanvasDragOptions) => {
	const activeDragRef = useRef<ActiveDrag | null>(null);
	const callbacksRef = useRef({ getSwapTarget, placeOrRepositionItem });

	useEffect(() => {
		activeDragRef.current = activeDrag;
	}, [activeDrag]);

	useEffect(() => {
		callbacksRef.current = { getSwapTarget, placeOrRepositionItem };
	}, [getSwapTarget, placeOrRepositionItem]);

	useEffect(() => {
		ensureGsapPlugins();
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: targetCanvasIdRef is a ref and doesn't need to be in deps
	useLayoutEffect(() => {
		if (!canvasRef.current || !blockWidth || !blockHeight) {
			return;
		}

		for (const handle of draggablesRef.current) {
			handle.cleanup();
		}
		draggablesRef.current = [];

		for (const item of canvas.placedItems) {
			const el = placedItemRefs.current.get(item.id);
			if (!el) {
				continue;
			}

			const placedItem = item;
			const dragData: DragData = {
				itemId: placedItem.itemId,
				itemType: placedItem.type,
				isReposition: true,
				fromBlockX: placedItem.blockX,
				fromBlockY: placedItem.blockY,
			};

			const startX = placedItem.blockX * stepX;
			const startY = placedItem.blockY * stepY;

			const getOtherPlacedElements = () => {
				const others: Element[] = [];
				for (const [id, element] of placedItemRefs.current) {
					if (id !== placedItem.id) {
						others.push(element);
					}
				}
				return others;
			};

			const handle = createDraggable(el, {
				inertia: false,
				minimumMovement: 4,
				onClick: () => {
					if (el.dataset.wasDragged === "true") {
						el.dataset.wasDragged = "false";
						return;
					}
					if (onPlacedItemClick && isItemClickable(placedItem)) {
						onPlacedItemClick(placedItem);
					}
				},
				onDragStart: function (this: Draggable) {
					el.dataset.wasDragged = "true";
					const rect = el.getBoundingClientRect();
					const pointerOffset = {
						x: this.pointerX - rect.left,
						y: this.pointerY - rect.top,
					};

					setDraggingItemId(placedItem.id);
					setActiveDrag({
						source: "canvas",
						data: {
							...dragData,
							itemName: placedItem.type,
						},
						sourceCanvasId: resolvedCanvasId,
						element: el,
						initialRect: rect,
						pointerOffset,
					});
					targetCanvasIdRef.current = resolvedCanvasId;

					el.style.opacity = "0";
				},
				onDrag: function (this: Draggable) {
					const centerX = startX + this.x + blockWidth / 2;
					const centerY = startY + this.y + blockHeight / 2;
					const { blockX, blockY } = convertPixelToBlock(
						centerX,
						centerY,
						gridMetrics,
					);

					const isOutOfBounds =
						blockX < 0 ||
						blockY < 0 ||
						blockX >= canvas.config.columns ||
						blockY >= canvas.config.rows;

					if (isOutOfBounds) {
						setHoveredBlock(null);
						setDragPreview(null);
						return;
					}

					const collidingElement = hitTestAny(
						el,
						getOtherPlacedElements(),
						"50%",
					);
					const hasCollision = collidingElement !== null;
					const swapTarget = callbacksRef.current.getSwapTarget(dragData, {
						blockX,
						blockY,
					});
					const canSwap = Boolean(swapTarget);

					const isOriginalPosition =
						blockX === placedItem.blockX && blockY === placedItem.blockY;

					setHoveredBlock({ x: blockX, y: blockY });
					setDragPreview({
						itemId: placedItem.itemId,
						itemType: placedItem.type,
						blockX,
						blockY,
						x: blockX * stepX,
						y: blockY * stepY,
						width: blockWidth,
						height: blockHeight,
						valid: !hasCollision || isOriginalPosition || canSwap,
					});
				},
				onDragEnd: function (this: Draggable) {
					const inventoryPanels = Array.from(
						document.querySelectorAll<HTMLElement>("[data-inventory-panel]"),
					);
					const isOverInventory = inventoryPanels.some((panel) => {
						const rect = panel.getBoundingClientRect();
						return (
							this.pointerX >= rect.left &&
							this.pointerX <= rect.right &&
							this.pointerY >= rect.top &&
							this.pointerY <= rect.bottom
						);
					});

					const dragSnapshot = activeDragRef.current;
					const targetCanvasId = targetCanvasIdRef.current;
					const sourceCanvasId =
						dragSnapshot?.sourceCanvasId ?? resolvedCanvasId;
					const isCrossCanvas =
						targetCanvasId && targetCanvasId !== sourceCanvasId;

					const finishDrag = (restoreOpacity = true) => {
						setActiveDrag(null);
						setDragPreview(null);
						setHoveredBlock(null);
						setDraggingItemId(null);
						targetCanvasIdRef.current = undefined;
						if (restoreOpacity) {
							el.style.opacity = "1";
						}
					};

					const animateProxyTo = (
						targetX: number,
						targetY: number,
						targetWidth: number,
						targetHeight: number,
						onComplete: () => void,
					) => {
						if (!proxyRef.current) {
							onComplete();
							return;
						}

						gsap.to(proxyRef.current, {
							x: targetX,
							y: targetY,
							width: targetWidth,
							height: targetHeight,
							duration: 0.2,
							ease: "power2.out",
							onComplete,
						});
					};

					if (isOverInventory) {
						dispatch({
							type: "REMOVE_ITEM",
							payload: {
								blockX: placedItem.blockX,
								blockY: placedItem.blockY,
								canvasId,
							},
						});
						gsap.set(el, { x: 0, y: 0, clearProps: "transform" });
						finishDrag(false);
						return;
					}

					if (isCrossCanvas && state.canvases) {
						const targetCanvas = state.canvases[targetCanvasId];
						const targetElement = document.querySelector<HTMLDivElement>(
							`[data-game-canvas][data-canvas-id="${targetCanvasId}"]`,
						);

						if (targetCanvas && targetElement) {
							const rect = targetElement.getBoundingClientRect();
							const styles = window.getComputedStyle(targetElement);
							const gapX = Number.parseFloat(
								styles.columnGap || styles.gap || "0",
							);
							const gapY = Number.parseFloat(
								styles.rowGap || styles.gap || "0",
							);
							const targetBlockWidth =
								(rect.width - gapX * (targetCanvas.config.columns - 1)) /
									targetCanvas.config.columns || 0;

							const { blockX, blockY } = convertPixelToBlock(
								this.pointerX - rect.left,
								this.pointerY - rect.top,
								{
									blockWidth: targetBlockWidth,
									blockHeight,
									gapX,
									gapY,
								},
							);

							const isInsideTarget =
								blockX >= 0 &&
								blockY >= 0 &&
								blockX < targetCanvas.config.columns &&
								blockY < targetCanvas.config.rows;

							if (isInsideTarget) {
								const targetBlock = targetCanvas.blocks[blockY]?.[blockX];
								const isTargetOccupied = Boolean(targetBlock?.itemId);

								if (isTargetOccupied) {
									dispatch({
										type: "SWAP_ITEMS",
										payload: {
											from: {
												canvasId: sourceCanvasId,
												blockX: placedItem.blockX,
												blockY: placedItem.blockY,
											},
											to: {
												canvasId: targetCanvasId,
												blockX,
												blockY,
											},
										},
									});
								} else {
									dispatch({
										type: "TRANSFER_ITEM",
										payload: {
											itemId: placedItem.itemId,
											fromCanvas: sourceCanvasId,
											fromBlockX: placedItem.blockX,
											fromBlockY: placedItem.blockY,
											toCanvas: targetCanvasId,
											toBlockX: blockX,
											toBlockY: blockY,
										},
									});
								}
								gsap.set(el, { x: 0, y: 0, clearProps: "transform" });
								finishDrag();
								return;
							}
						}

						gsap.set(el, { x: 0, y: 0, clearProps: "transform" });
						finishDrag();
						return;
					}

					const canvasElement = canvasRef.current;
					if (!canvasElement) {
						gsap.set(el, { x: 0, y: 0, clearProps: "transform" });
						finishDrag();
						return;
					}

					const canvasRect = canvasElement.getBoundingClientRect();
					const centerX = startX + this.x + blockWidth / 2;
					const centerY = startY + this.y + blockHeight / 2;
					const { blockX, blockY } = convertPixelToBlock(
						centerX,
						centerY,
						gridMetrics,
					);
					const swapTarget = callbacksRef.current.getSwapTarget(dragData, {
						blockX,
						blockY,
					});
					const collidingElement = hitTestAny(
						el,
						getOtherPlacedElements(),
						"50%",
					);

					if (collidingElement && !swapTarget) {
						gsap.set(el, { x: 0, y: 0, clearProps: "transform" });
						const originX = canvasRect.left + placedItem.blockX * stepX;
						const originY = canvasRect.top + placedItem.blockY * stepY;
						animateProxyTo(originX, originY, blockWidth, blockHeight, () => {
							finishDrag();
						});
						return;
					}

					const placed = callbacksRef.current.placeOrRepositionItem(dragData, {
						blockX,
						blockY,
					});
					if (!placed) {
						gsap.set(el, { x: 0, y: 0, clearProps: "transform" });
						const originX = canvasRect.left + placedItem.blockX * stepX;
						const originY = canvasRect.top + placedItem.blockY * stepY;
						animateProxyTo(originX, originY, blockWidth, blockHeight, () => {
							finishDrag();
						});
						return;
					}

					const targetX = canvasRect.left + blockX * stepX;
					const targetY = canvasRect.top + blockY * stepY;
					gsap.set(el, { x: 0, y: 0, clearProps: "transform" });
					animateProxyTo(targetX, targetY, blockWidth, blockHeight, () => {
						finishDrag();
					});
				},
			});

			draggablesRef.current.push(handle);
		}

		return () => {
			for (const handle of draggablesRef.current) {
				handle.cleanup();
			}
			draggablesRef.current = [];
		};
	}, [
		blockHeight,
		blockWidth,
		canvas.placedItems,
		canvas.config.columns,
		canvas.config.rows,
		resolvedCanvasId,
		dispatch,
		getSwapTarget,
		gridMetrics,
		isItemClickable,
		onPlacedItemClick,
		placeOrRepositionItem,
		proxyRef,
		setActiveDrag,
		setDragPreview,
		setHoveredBlock,
		setDraggingItemId,
		state.canvases,
		canvasId,
		stepX,
		stepY,
	]);
};
