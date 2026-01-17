import { Box, Flex, Text } from "@chakra-ui/react";
import { gsap } from "gsap";
import {
	memo,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useDragContext } from "./drag-context";
import type { DragData } from "./drag-types";
import {
	type PlacedItem,
	useGameDispatch,
	useGameState,
} from "./game-provider";
import {
	convertPixelToBlock,
	createDraggable,
	type DragHandle,
	ensureGsapPlugins,
	type GridMetrics,
} from "./gsap-drag";

type ItemLabelGetter = (itemType: string) => string;
type StatusMessageGetter = (placedItem: PlacedItem) => string | null;
type PlacedItemClickHandler = (placedItem: PlacedItem) => void;
type ItemClickableCheck = (placedItem: PlacedItem) => boolean;

type PlayCanvasProps = {
	stateKey?: string;
	getItemLabel?: ItemLabelGetter;
	getStatusMessage?: StatusMessageGetter;
	onPlacedItemClick?: PlacedItemClickHandler;
	isItemClickable?: ItemClickableCheck;
};

type DragPreview = {
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

const defaultGetItemLabel: ItemLabelGetter = (itemType: string) => {
	return itemType.charAt(0).toUpperCase() + itemType.slice(1);
};

const defaultGetStatusMessage: StatusMessageGetter = () => {
	return null;
};

const defaultIsItemClickable: ItemClickableCheck = () => true;

const BlockCell = memo(
	({
		placedItem,
		borderColor,
		showBorder,
		getItemLabel,
		getStatusMessage,
		cellRef,
	}: {
		placedItem?: PlacedItem;
		borderColor: string;
		showBorder: boolean;
		getItemLabel: ItemLabelGetter;
		getStatusMessage: StatusMessageGetter;
		cellRef?: React.RefCallback<HTMLDivElement>;
	}) => {
		const borderStyle = placedItem ? "solid" : showBorder ? "dashed" : "solid";
		const resolvedBorderColor =
			placedItem || showBorder ? borderColor : "transparent";

		const itemLabel = placedItem ? getItemLabel(placedItem.type) : null;
		const statusMessage = placedItem ? getStatusMessage(placedItem) : null;
		const hasWarning = placedItem?.status === "warning";

		return (
			<Box
				ref={cellRef}
				border={`1px ${borderStyle}`}
				borderColor={resolvedBorderColor}
				borderRadius="md"
				bg={placedItem ? "gray.900" : "transparent"}
				display="flex"
				flexDirection="column"
				alignItems="center"
				justifyContent="center"
				minHeight="40px"
				gap={1}
				p={2}
				transition="border-color 0.15s ease"
				cursor={placedItem ? "grab" : "default"}
				position="relative"
				style={{ touchAction: "none" }}
				aria-label={
					placedItem
						? `${itemLabel}${statusMessage ? `: ${statusMessage}` : ""}`
						: undefined
				}
			>
				{placedItem ? (
					<>
						<Text fontSize="xs" fontWeight="bold" color="gray.100">
							{itemLabel}
						</Text>
						{statusMessage && (
							<Box
								fontSize="10px"
								px={2}
								py={0.5}
								borderRadius="sm"
								border={hasWarning ? "1px solid" : "none"}
								borderColor={hasWarning ? "red.500" : "transparent"}
								bg={hasWarning ? "red.900/20" : "transparent"}
								color={hasWarning ? "red.300" : "green.300"}
								fontWeight="medium"
							>
								{statusMessage}
							</Box>
						)}
					</>
				) : null}
			</Box>
		);
	},
	(prev, next) =>
		prev.placedItem?.id === next.placedItem?.id &&
		prev.placedItem?.status === next.placedItem?.status &&
		prev.placedItem?.data?.ip === next.placedItem?.data?.ip &&
		prev.borderColor === next.borderColor &&
		prev.showBorder === next.showBorder,
);

export const PlayCanvas = ({
	stateKey,
	getItemLabel = defaultGetItemLabel,
	getStatusMessage = defaultGetStatusMessage,
	onPlacedItemClick,
	isItemClickable = defaultIsItemClickable,
}: PlayCanvasProps) => {
	const state = useGameState();
	const dispatch = useGameDispatch();
	const { activeDrag, setActiveDrag } = useDragContext();
	const canvas = stateKey
		? (state.canvases?.[stateKey] ?? state.canvas)
		: state.canvas;
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

	const placedItemsByKey = useMemo(() => {
		const map = new Map<string, PlacedItem>();
		for (const item of canvas.placedItems) {
			map.set(`${item.blockX}-${item.blockY}`, item);
		}
		return map;
	}, [canvas.placedItems]);

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
		(canvasSize.height - canvasSize.gapY * (canvas.config.rows - 1)) /
			canvas.config.rows || 0;
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
		(data: DragData, target: { blockX: number; blockY: number }) => {
			if (
				target.blockX < 0 ||
				target.blockY < 0 ||
				target.blockX >= canvas.config.columns ||
				target.blockY >= canvas.config.rows
			) {
				return false;
			}

			const blockKey = `${target.blockX}-${target.blockY}`;
			const placedItem = placedItemsByKey.get(blockKey);
			const isOccupied = Boolean(placedItem);
			const isAllowed =
				!canvas.config.allowedItemTypes ||
				canvas.config.allowedItemTypes.includes(data.itemType);

			return !isOccupied && isAllowed;
		},
		[
			canvas.config.allowedItemTypes,
			canvas.config.columns,
			canvas.config.rows,
			placedItemsByKey,
		],
	);

	const placeOrRepositionItem = useCallback(
		(data: DragData, target: { blockX: number; blockY: number }) => {
			if (!canPlaceItemAt(data, target)) {
				return false;
			}

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

				dispatch({
					type: "REMOVE_ITEM",
					payload: {
						blockX: data.fromBlockX,
						blockY: data.fromBlockY,
						stateKey,
					},
				});
			}

			dispatch({
				type: "PLACE_ITEM",
				payload: {
					itemId: data.itemId,
					blockX: target.blockX,
					blockY: target.blockY,
					stateKey,
				},
			});

			return true;
		},
		[canPlaceItemAt, dispatch, stateKey],
	);

	useEffect(() => {
		ensureGsapPlugins();
	}, []);

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

			const handle = createDraggable(el, {
				bounds: canvasRef.current,
				liveSnap: {
					x: (value: number) => Math.round(value / stepX) * stepX,
					y: (value: number) => Math.round(value / stepY) * stepY,
				},
				edgeResistance: 0.65,
				minimumMovement: 4,
				onDragStart: () => {
					setDraggingItemId(placedItem.id);
					setActiveDrag({
						source: "canvas",
						data: dragData,
						element: el,
					});
				},
				onDrag: function (this: Draggable) {
					const absoluteX = startX + this.x;
					const absoluteY = startY + this.y;
					const { blockX, blockY } = convertPixelToBlock(
						absoluteX,
						absoluteY,
						gridMetrics,
					);
					const valid = canPlaceItemAt(
						{
							...dragData,
							fromBlockX: placedItem.blockX,
							fromBlockY: placedItem.blockY,
						},
						{ blockX, blockY },
					);
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
						valid:
							valid ||
							(blockX === placedItem.blockX && blockY === placedItem.blockY),
					});
				},
				onDragEnd: function (this: Draggable) {
					const absoluteX = startX + this.x;
					const absoluteY = startY + this.y;
					const { blockX, blockY } = convertPixelToBlock(
						absoluteX,
						absoluteY,
						gridMetrics,
					);

					const placed = placeOrRepositionItem(dragData, { blockX, blockY });

					if (!placed) {
						gsap.to(el, {
							x: 0,
							y: 0,
							duration: 0.3,
							ease: "power2.out",
						});
					} else {
						gsap.set(el, { x: 0, y: 0, clearProps: "transform" });
					}

					setDraggingItemId(null);
					setActiveDrag(null);
					setDragPreview(null);
					setHoveredBlock(null);
				},
				onClick: () => {
					if (onPlacedItemClick && isItemClickable(placedItem)) {
						onPlacedItemClick(placedItem);
					}
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
		canPlaceItemAt,
		canvas.placedItems,
		gridMetrics,
		isItemClickable,
		onPlacedItemClick,
		placeOrRepositionItem,
		setActiveDrag,
		stepX,
		stepY,
	]);

	useEffect(() => {
		if (
			!activeDrag ||
			activeDrag.source !== "inventory" ||
			!canvasRef.current
		) {
			return;
		}

		const canvasElement = canvasRef.current;

		const handlePointerMove = (event: PointerEvent) => {
			const rect = canvasElement.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;

			if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
				setDragPreview(null);
				setHoveredBlock(null);
				return;
			}

			const { blockX, blockY } = convertPixelToBlock(x, y, gridMetrics);

			if (
				blockX < 0 ||
				blockY < 0 ||
				blockX >= canvas.config.columns ||
				blockY >= canvas.config.rows
			) {
				setDragPreview(null);
				setHoveredBlock(null);
				return;
			}

			const valid = canPlaceItemAt(activeDrag.data, { blockX, blockY });
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
		};

		const handlePointerUp = (event: PointerEvent) => {
			const rect = canvasElement.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;

			if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
				const { blockX, blockY } = convertPixelToBlock(x, y, gridMetrics);
				placeOrRepositionItem(activeDrag.data, { blockX, blockY });
			}

			setActiveDrag(null);
			setDragPreview(null);
			setHoveredBlock(null);
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
		canPlaceItemAt,
		canvas.config.columns,
		canvas.config.rows,
		gridMetrics,
		placeOrRepositionItem,
		stepX,
		stepY,
	]);

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

	const connections = useMemo(() => {
		if (!blockWidth || !blockHeight) {
			return [];
		}

		return canvas.connections.map((connection) => ({
			id: connection.id,
			x1: connection.from.x * stepX + blockWidth / 2,
			y1: connection.from.y * stepY + blockHeight / 2,
			x2: connection.to.x * stepX + blockWidth / 2,
			y2: connection.to.y * stepY + blockHeight / 2,
		}));
	}, [blockHeight, blockWidth, canvas.connections, stepX, stepY]);

	const showGrid = Boolean(
		dragPreview || draggingItemId || activeDrag || canvas.placedItems.length,
	);

	return (
		<Box
			className="play-canvas"
			data-game-canvas
			height="100%"
			bg="gray.950"
			p={4}
			overflow="hidden"
			contain="layout"
			position="relative"
			display="flex"
			flexDirection="column"
			gap={3}
		>
			<Flex align="center" justify="space-between" mb={4}>
				<Text fontSize="sm" fontWeight="bold" color="gray.200">
					Play Canvas
				</Text>
				<Text fontSize="xs" color="gray.500">
					{canvas.config.columns} x {canvas.config.rows}
				</Text>
			</Flex>

			<Box
				ref={canvasRef}
				position="relative"
				display="grid"
				gridTemplateColumns={`repeat(${canvas.config.columns}, minmax(0, 1fr))`}
				gridTemplateRows={`repeat(${canvas.config.rows}, minmax(0, 1fr))`}
				gap={2}
				flex="1"
				minHeight={0}
			>
				{canvas.blocks.flat().map((block) => {
					const key = `${block.x}-${block.y}`;
					const placedItem = placedItemsByKey.get(key);
					const isHovered =
						hoveredBlock?.x === block.x && hoveredBlock?.y === block.y;
					const isDragging = placedItem && draggingItemId === placedItem.id;
					const borderColor =
						isHovered && dragPreview
							? dragPreview.valid
								? "cyan.400"
								: "red.400"
							: placedItem
								? "green.400"
								: "gray.700";

					return (
						<BlockCell
							key={key}
							placedItem={isDragging ? undefined : placedItem}
							borderColor={borderColor}
							showBorder={showGrid || Boolean(placedItem)}
							getItemLabel={getItemLabel}
							getStatusMessage={getStatusMessage}
							cellRef={placedItem ? setPlacedItemRef(placedItem.id) : undefined}
						/>
					);
				})}
				{connections.length > 0 && (
					<Box position="absolute" inset={0} pointerEvents="none">
						<svg width="100%" height="100%" role="img" aria-label="Connections">
							<title>Connections</title>
							{connections.map((line) => (
								<line
									key={line.id}
									x1={line.x1}
									y1={line.y1}
									x2={line.x2}
									y2={line.y2}
									stroke="#22d3ee"
									strokeWidth={2}
								/>
							))}
						</svg>
					</Box>
				)}

				{dragPreview && (
					<Box
						position="absolute"
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
