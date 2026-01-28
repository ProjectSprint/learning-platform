import { Box, Flex, Text, useBreakpointValue } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type Block,
	findInventoryItem,
	type PlacedItem,
	useGameDispatch,
	useGameState,
} from "../../game-provider";
import { type DragData, type DragHandle, useDragContext } from "../drag";
import type { GridMetrics } from "../grid";
import { GridCell } from "./grid-cell";
import { PlacedItemCard } from "./placed-item-card";
import type {
	DragPreview,
	ItemClickableCheck,
	ItemLabelGetter,
	PlacedItemClickHandler,
	StatusMessageGetter,
} from "./types";
import { useBoardInteractions } from "./use-board-interactions";

const BLOCK_HEIGHT = 60;

type PuzzleBoardProps = {
	puzzleId?: string;
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

export const PuzzleBoard = ({
	puzzleId,
	title,
	getItemLabel = defaultGetItemLabel,
	getStatusMessage = defaultGetStatusMessage,
	onPlacedItemClick,
	isItemClickable = defaultIsItemClickable,
}: PuzzleBoardProps) => {
	const state = useGameState();
	const dispatch = useGameDispatch();
	const {
		activeDrag,
		setActiveDrag,
		proxyRef,
		targetPuzzleIdRef,
		setLastDropResult,
	} = useDragContext();
	const puzzle = puzzleId
		? (state.puzzles?.[puzzleId] ?? state.puzzle)
		: state.puzzle;
	const resolvedPuzzleId =
		puzzleId ?? puzzle.config.puzzleId ?? puzzle.config.id ?? "default";
	const boardRef = useRef<HTMLDivElement | null>(null);
	const placedItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
	const draggablesRef = useRef<DragHandle[]>([]);
	const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
	const [hoveredBlock, setHoveredBlock] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
	const [boardSize, setBoardSize] = useState({
		width: 0,
		height: 0,
		gapX: 0,
		gapY: 0,
	});
	const orientation = puzzle.config.orientation ?? "horizontal";

	const placedItemsByKey = useMemo(() => {
		const map = new Map<string, PlacedItem>();
		for (const item of puzzle.placedItems) {
			map.set(`${item.blockX}-${item.blockY}`, item);
		}
		return map;
	}, [puzzle.placedItems]);

	const orderedBlocks = useMemo(() => {
		if (orientation !== "vertical") {
			return puzzle.blocks.flat();
		}
		const blocks: Block[] = [];
		for (let x = 0; x < puzzle.config.columns; x += 1) {
			for (let y = 0; y < puzzle.config.rows; y += 1) {
				const block = puzzle.blocks[y]?.[x];
				if (block) {
					blocks.push(block);
				}
			}
		}
		return blocks;
	}, [puzzle.blocks, puzzle.config.columns, puzzle.config.rows, orientation]);

	useEffect(() => {
		const element = boardRef.current;
		if (!element) {
			return;
		}

		const updateSize = () => {
			const rect = element.getBoundingClientRect();
			const styles = window.getComputedStyle(element);
			const gapX = Number.parseFloat(styles.columnGap || styles.gap || "0");
			const gapY = Number.parseFloat(styles.rowGap || styles.gap || "0");
			setBoardSize({ width: rect.width, height: rect.height, gapX, gapY });
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
		(boardSize.width - boardSize.gapX * (puzzle.config.columns - 1)) /
			puzzle.config.columns || 0;
	const blockHeight =
		useBreakpointValue({ base: 48, sm: 54, md: 60 }) ?? BLOCK_HEIGHT;
	const stepX = blockWidth + boardSize.gapX;
	const stepY = blockHeight + boardSize.gapY;

	const gridMetrics: GridMetrics = useMemo(
		() => ({
			blockWidth,
			blockHeight,
			gapX: boardSize.gapX,
			gapY: boardSize.gapY,
		}),
		[blockWidth, blockHeight, boardSize.gapX, boardSize.gapY],
	);

	const canPlaceItemAt = useCallback(
		(
			data: DragData,
			target: { blockX: number; blockY: number },
			targetPuzzleId?: string,
		) => {
			if (
				target.blockX < 0 ||
				target.blockY < 0 ||
				target.blockX >= puzzle.config.columns ||
				target.blockY >= puzzle.config.rows
			) {
				return false;
			}

			// Check allowedPlaces for the target puzzle
			if (targetPuzzleId) {
				const inventoryMatch = findInventoryItem(
					state.inventory.groups,
					data.itemId,
				);
				if (
					inventoryMatch?.item &&
					!inventoryMatch.item.allowedPlaces.includes(targetPuzzleId)
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
			puzzle.config.columns,
			puzzle.config.rows,
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
								puzzleId,
								blockX: data.fromBlockX,
								blockY: data.fromBlockY,
							},
							to: {
								puzzleId,
								blockX: target.blockX,
								blockY: target.blockY,
							},
						},
					});
					return true;
				}

				if (!canPlaceItemAt(data, target, resolvedPuzzleId)) {
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
						puzzleId,
					},
				});

				return true;
			}

			if (!canPlaceItemAt(data, target, resolvedPuzzleId)) {
				return false;
			}

			dispatch({
				type: "PLACE_ITEM",
				payload: {
					itemId: data.itemId,
					blockX: target.blockX,
					blockY: target.blockY,
					puzzleId,
				},
			});

			return true;
		},
		[canPlaceItemAt, dispatch, getSwapTarget, puzzleId, resolvedPuzzleId],
	);

	useBoardInteractions({
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
			className="puzzle-board"
			data-puzzle-board
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
				ref={boardRef}
				position="relative"
				display="grid"
				data-puzzle-board
				data-puzzle-id={resolvedPuzzleId}
				gridTemplateColumns={`repeat(${puzzle.config.columns}, minmax(0, 1fr))`}
				gridTemplateRows={`repeat(${puzzle.config.rows}, ${blockHeight}px)`}
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

				{puzzle.placedItems.map((item) => {
					const isDragging = draggingItemId === item.id;
					return (
						<PlacedItemCard
							key={item.id}
							item={item}
							puzzleId={resolvedPuzzleId}
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

export type { PuzzleBoardProps };
