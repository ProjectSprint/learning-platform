import { Box, Flex, Text, useBreakpointValue } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type DragData, type DragHandle, useDragContext } from "../drag";
import {
	type Block,
	findInventoryItem,
	type PlacedItem,
	useGameDispatch,
	useGameState,
} from "../game-provider";
import type { GridMetrics } from "../grid";
import { GridCell } from "./components/grid-cell";
import { PlacedItemCard } from "./components/placed-item-card";
import { useCanvasInteractions } from "./hooks/use-canvas-interactions";
import type {
	DragPreview,
	ItemClickableCheck,
	ItemLabelGetter,
	PlacedItemClickHandler,
	StatusMessageGetter,
} from "./types";

const BLOCK_HEIGHT = 60;

type PlayCanvasProps = {
	canvasId?: string;
	title?: string;
	getItemLabel?: ItemLabelGetter;
	getStatusMessage?: StatusMessageGetter;
	onPlacedItemClick?: PlacedItemClickHandler;
	isItemClickable?: ItemClickableCheck;
};

const defaultGetItemLabel: ItemLabelGetter = (itemType: string) => {
	return itemType.charAt(0).toUpperCase() + itemType.slice(1);
};

const defaultGetStatusMessage: StatusMessageGetter = () => {
	return null;
};

const defaultIsItemClickable: ItemClickableCheck = () => true;

export const PlayCanvas = ({
	canvasId,
	title,
	getItemLabel = defaultGetItemLabel,
	getStatusMessage = defaultGetStatusMessage,
	onPlacedItemClick,
	isItemClickable = defaultIsItemClickable,
}: PlayCanvasProps) => {
	const state = useGameState();
	const dispatch = useGameDispatch();
	const {
		activeDrag,
		setActiveDrag,
		proxyRef,
		targetCanvasIdRef,
		setLastDropResult,
	} = useDragContext();
	const canvas = canvasId
		? (state.canvases?.[canvasId] ?? state.canvas)
		: state.canvas;
	const resolvedCanvasId =
		canvasId ?? canvas.config.canvasId ?? canvas.config.id ?? "default";
	const canvasRef = useRef<HTMLDivElement | null>(null);
	const placedItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
	const draggablesRef = useRef<DragHandle[]>([]);
	const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
	const [hoveredBlock, setHoveredBlock] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
	const [canvasSize, setCanvasSize] = useState({
		width: 0,
		height: 0,
		gapX: 0,
		gapY: 0,
	});
	const orientation = canvas.config.orientation ?? "horizontal";

	const placedItemsByKey = useMemo(() => {
		const map = new Map<string, PlacedItem>();
		for (const item of canvas.placedItems) {
			map.set(`${item.blockX}-${item.blockY}`, item);
		}
		return map;
	}, [canvas.placedItems]);

	const orderedBlocks = useMemo(() => {
		if (orientation !== "vertical") {
			return canvas.blocks.flat();
		}
		const blocks: Block[] = [];
		for (let x = 0; x < canvas.config.columns; x += 1) {
			for (let y = 0; y < canvas.config.rows; y += 1) {
				const block = canvas.blocks[y]?.[x];
				if (block) {
					blocks.push(block);
				}
			}
		}
		return blocks;
	}, [canvas.blocks, canvas.config.columns, canvas.config.rows, orientation]);

	useEffect(() => {
		const element = canvasRef.current;
		if (!element) {
			return;
		}

		const updateSize = () => {
			const rect = element.getBoundingClientRect();
			const styles = window.getComputedStyle(element);
			const gapX = Number.parseFloat(styles.columnGap || styles.gap || "0");
			const gapY = Number.parseFloat(styles.rowGap || styles.gap || "0");
			setCanvasSize({ width: rect.width, height: rect.height, gapX, gapY });
		};

		updateSize();

		if (typeof ResizeObserver === "undefined") {
			window.addEventListener("resize", updateSize);
			return () => window.removeEventListener("resize", updateSize);
		}

		const observer = new ResizeObserver(updateSize);
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	const blockWidth =
		(canvasSize.width - canvasSize.gapX * (canvas.config.columns - 1)) /
			canvas.config.columns || 0;
	const blockHeight =
		useBreakpointValue({ base: 48, sm: 54, md: 60 }) ?? BLOCK_HEIGHT;
	const stepX = blockWidth + canvasSize.gapX;
	const stepY = blockHeight + canvasSize.gapY;

	const gridMetrics: GridMetrics = useMemo(
		() => ({
			blockWidth,
			blockHeight,
			gapX: canvasSize.gapX,
			gapY: canvasSize.gapY,
		}),
		[blockWidth, blockHeight, canvasSize.gapX, canvasSize.gapY],
	);

	const canPlaceItemAt = useCallback(
		(
			data: DragData,
			target: { blockX: number; blockY: number },
			targetCanvasId?: string,
		) => {
			if (
				target.blockX < 0 ||
				target.blockY < 0 ||
				target.blockX >= canvas.config.columns ||
				target.blockY >= canvas.config.rows
			) {
				return false;
			}

			// Check allowedPlaces for the target canvas
			if (targetCanvasId) {
				const inventoryMatch = findInventoryItem(
					state.inventory.groups,
					data.itemId,
				);
				if (
					inventoryMatch?.item &&
					!inventoryMatch.item.allowedPlaces.includes(targetCanvasId)
				) {
					return false;
				}
			}

			const blockKey = `${target.blockX}-${target.blockY}`;
			const placedItem = placedItemsByKey.get(blockKey);
			const isOccupied = Boolean(placedItem);

			return !isOccupied;
		},
		[
			canvas.config.columns,
			canvas.config.rows,
			placedItemsByKey,
			state.inventory.groups,
		],
	);

	const getSwapTarget = useCallback(
		(data: DragData, target: { blockX: number; blockY: number }) => {
			if (!data.isReposition) {
				return null;
			}

			const blockKey = `${target.blockX}-${target.blockY}`;
			const targetItem = placedItemsByKey.get(blockKey);
			if (!targetItem) {
				return null;
			}

			if (targetItem.itemId === data.itemId) {
				return null;
			}

			return targetItem;
		},
		[placedItemsByKey],
	);

	const placeOrRepositionItem = useCallback(
		(data: DragData, target: { blockX: number; blockY: number }) => {
			if (
				data.isReposition &&
				typeof data.fromBlockX === "number" &&
				typeof data.fromBlockY === "number"
			) {
				if (
					data.fromBlockX === target.blockX &&
					data.fromBlockY === target.blockY
				) {
					return false;
				}

				const swapTarget = getSwapTarget(data, target);
				if (swapTarget) {
					dispatch({
						type: "SWAP_ITEMS",
						payload: {
							from: {
								canvasId,
								blockX: data.fromBlockX,
								blockY: data.fromBlockY,
							},
							to: {
								canvasId,
								blockX: target.blockX,
								blockY: target.blockY,
							},
						},
					});
					return true;
				}

				if (!canPlaceItemAt(data, target, resolvedCanvasId)) {
					return false;
				}

				dispatch({
					type: "REPOSITION_ITEM",
					payload: {
						itemId: data.itemId,
						fromBlockX: data.fromBlockX,
						fromBlockY: data.fromBlockY,
						toBlockX: target.blockX,
						toBlockY: target.blockY,
						canvasId,
					},
				});

				return true;
			}

			if (!canPlaceItemAt(data, target, resolvedCanvasId)) {
				return false;
			}

			dispatch({
				type: "PLACE_ITEM",
				payload: {
					itemId: data.itemId,
					blockX: target.blockX,
					blockY: target.blockY,
					canvasId,
				},
			});

			return true;
		},
		[canPlaceItemAt, dispatch, getSwapTarget, canvasId, resolvedCanvasId],
	);

	useCanvasInteractions({
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
	});

	const setPlacedItemRef = useCallback(
		(itemId: string) => (el: HTMLDivElement | null) => {
			if (el) {
				placedItemRefs.current.set(itemId, el);
			} else {
				placedItemRefs.current.delete(itemId);
			}
		},
		[],
	);

	const showGrid = true;

	return (
		<Box
			className="play-canvas"
			data-game-canvas
			bg="gray.950"
			p={{ base: 2, md: 4 }}
			overflow="visible"
			position="relative"
			display="flex"
			flexDirection="column"
			gap={3}
		>
			{title ? (
				<Flex align="center" justify="space-between" mb={{ base: 0, md: 4 }}>
					<Text
						fontSize={{ base: "xs", md: "sm" }}
						fontWeight="bold"
						color="gray.200"
					>
						{title}
					</Text>
				</Flex>
			) : null}

			<Box
				ref={canvasRef}
				position="relative"
				display="grid"
				data-game-canvas
				data-canvas-id={resolvedCanvasId}
				gridTemplateColumns={`repeat(${canvas.config.columns}, minmax(0, 1fr))`}
				gridTemplateRows={`repeat(${canvas.config.rows}, ${blockHeight}px)`}
				gridAutoFlow={orientation === "vertical" ? "column" : "row"}
				gap={2}
			>
				{orderedBlocks.map((block) => {
					const key = `${block.x}-${block.y}`;
					const placedItem = placedItemsByKey.get(key);
					const isHovered =
						hoveredBlock?.x === block.x && hoveredBlock?.y === block.y;
					const borderColor =
						isHovered && dragPreview
							? dragPreview.valid
								? "cyan.400"
								: "red.400"
							: "gray.700";

					return (
						<GridCell
							key={key}
							borderColor={borderColor}
							showBorder={showGrid}
							isOccupied={Boolean(placedItem)}
							height={blockHeight}
						/>
					);
				})}

				{canvas.placedItems.map((item) => {
					const isDragging = draggingItemId === item.id;
					return (
						<PlacedItemCard
							key={item.id}
							item={item}
							x={item.blockX * stepX}
							y={item.blockY * stepY}
							width={blockWidth}
							height={blockHeight}
							isDragging={isDragging}
							getItemLabel={getItemLabel}
							getStatusMessage={getStatusMessage}
							itemRef={setPlacedItemRef(item.id)}
						/>
					);
				})}

				{dragPreview && (
					<Box
						position="absolute"
						zIndex={10}
						top={`${dragPreview.y}px`}
						left={`${dragPreview.x}px`}
						width={`${dragPreview.width}px`}
						height={`${dragPreview.height}px`}
						border="1px dashed"
						borderColor={dragPreview.valid ? "cyan.300" : "red.400"}
						borderRadius="md"
						pointerEvents="none"
						display="flex"
						alignItems="center"
						justifyContent="center"
						bg="rgba(15, 23, 42, 0.8)"
					>
						<Text fontSize="xs" color="gray.100">
							{getItemLabel(dragPreview.itemType)}
						</Text>
					</Box>
				)}
			</Box>
		</Box>
	);
};

export type { PlayCanvasProps };
