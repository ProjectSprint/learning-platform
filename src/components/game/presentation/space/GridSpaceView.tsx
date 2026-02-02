/**
 * GridSpaceView component.
 * Renders a GridSpace with its entities positioned on a grid.
 * Similar to PuzzleBoard but works with the Space/Entity model.
 *
 * Uses the infrastructure grid system for positioning and supports
 * drag and drop interactions.
 */

import { Box, Flex, Text, useBreakpointValue } from "@chakra-ui/react";
import { gsap } from "gsap";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type EntityData, isItemData } from "../../domain/entity/entity-data";
import type {
	GridPosition,
	GridSpaceData,
} from "../../domain/space/space-data";
import { type EntityStatus, PlacedEntity } from "../entity/PlacedEntity";
import { useDragContext } from "../interaction/drag/DragContext";
import { useBoardRegistry } from "./arrow";
import { GridCell } from "./GridCell";

const DEFAULT_CELL_HEIGHT = 60;
const CLICK_THRESHOLD_PX = 5;

/**
 * Preview state for drag operations.
 */
type DragPreview = {
	x: number;
	y: number;
	width: number;
	height: number;
	valid: boolean;
	entityType: string;
};

/**
 * Props for the GridSpaceView component.
 */
export type GridSpaceViewProps = {
	/** The grid space to render */
	space: GridSpaceData;
	/** Entities positioned in this space */
	entities: Array<{ entity: EntityData; position: GridPosition }>;
	/** Optional title for the space */
	title?: string;
	/** Grid orientation */
	orientation?: "horizontal" | "vertical";
	/** Override the number of columns to render (view-layer only) */
	viewCols?: number;
	/** Override the number of rows to render (view-layer only) */
	viewRows?: number;
	/** Function to get display label for an entity */
	getEntityLabel?: (entity: EntityData) => string;
	/** Function to get status for a placed entity */
	getEntityStatus?: (entity: EntityData) => {
		status?: EntityStatus;
		message?: string | null;
	};
	/** Callback when an entity in the grid is clicked */
	onEntityClick?: (entity: EntityData, position: GridPosition) => void;
	/** Check if an entity can be clicked */
	isEntityClickable?: (entity: EntityData) => boolean;
	/** Callback to check if an entity can be placed at a position */
	canPlaceAt?: (
		entityId: string,
		position: GridPosition,
		spaceId: string,
	) => boolean;
	/** Callback to place or move an entity */
	onPlaceEntity?: (
		entityId: string,
		fromPosition: GridPosition | null,
		toPosition: GridPosition,
	) => boolean;
};

const defaultGetEntityLabel = (entity: EntityData) =>
	entity.name ?? entity.type;
const defaultGetEntityStatus = () => ({});
const defaultIsEntityClickable = () => true;

/**
 * GridSpaceView component.
 * Renders entities on a grid with drag and drop support.
 *
 * Visual design matches the current PuzzleBoard component.
 *
 * @example
 * ```tsx
 * <GridSpaceView
 *   space={gridSpace}
 *   entities={positionedEntities}
 *   title="Puzzle Board"
 *   onPlaceEntity={handlePlace}
 * />
 * ```
 */
export const GridSpaceView = ({
	space,
	entities,
	title,
	orientation = "horizontal",
	viewCols,
	viewRows,
	getEntityLabel: _getEntityLabel = defaultGetEntityLabel,
	getEntityStatus = defaultGetEntityStatus,
	onEntityClick,
	isEntityClickable = defaultIsEntityClickable,
	canPlaceAt,
	onPlaceEntity,
}: GridSpaceViewProps) => {
	const {
		activeDrag,
		setActiveDrag,
		targetSpaceIdRef,
		setLastDropResult,
		dropAnimationTarget,
		setDropAnimationTarget,
	} = useDragContext();

	const boardRef = useRef<HTMLDivElement | null>(null);
	const entityRefs = useRef<Map<string, HTMLDivElement>>(new Map());
	const pendingInteractionRef = useRef<{
		entity: EntityData;
		position: GridPosition;
		startX: number;
		startY: number;
		element: HTMLElement;
		rect: DOMRect;
	} | null>(null);
	const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
	const [hoveredCell, setHoveredCell] = useState<GridPosition | null>(null);
	const hoveredCellRef = useRef<GridPosition | null>(null);
	const [draggingEntityId, setDraggingEntityId] = useState<string | null>(null);
	const [boardSize, setBoardSize] = useState({
		width: 0,
		height: 0,
		gapX: 0,
		gapY: 0,
	});

	const rows = viewRows ?? space.rows;
	const cols = viewCols ?? space.cols;

	// Create map of entities by position
	const entitiesByPosition = useMemo(() => {
		const map = new Map<
			string,
			{ entity: EntityData; position: GridPosition }
		>();
		for (const item of entities) {
			const key = `${item.position.row}-${item.position.col}`;
			map.set(key, item);
		}
		return map;
	}, [entities]);

	// Register board with arrow registry for arrows to find this element
	const { registerBoard } = useBoardRegistry();
	useEffect(() => {
		if (boardRef.current) {
			registerBoard(space.id, boardRef.current);
		}
		return () => {
			registerBoard(space.id, null);
		};
	}, [space.id, registerBoard]);

	// Track board size for grid calculations
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

	const cellHeight =
		useBreakpointValue({ base: 48, sm: 54, md: 60 }) ?? DEFAULT_CELL_HEIGHT;
	const cellWidth = (boardSize.width - boardSize.gapX * (cols - 1)) / cols || 0;
	const stepX = cellWidth + boardSize.gapX;
	const stepY = cellHeight + boardSize.gapY;

	// Generate all grid cells
	const gridCells = useMemo(() => {
		const cells: Array<{ row: number; col: number; key: string }> = [];

		if (orientation !== "vertical") {
			// Horizontal: row-major order
			for (let row = 0; row < rows; row++) {
				for (let col = 0; col < cols; col++) {
					cells.push({ row, col, key: `${row}-${col}` });
				}
			}
		} else {
			// Vertical: column-major order
			for (let col = 0; col < cols; col++) {
				for (let row = 0; row < rows; row++) {
					cells.push({ row, col, key: `${row}-${col}` });
				}
			}
		}

		return cells;
	}, [rows, cols, orientation]);

	// Handle pointer down on grid entity: stores pending interaction.
	// The drag is NOT started here — it's deferred until movement exceeds threshold.
	// Allows interaction if entity is draggable OR clickable.
	const handleEntityPointerDown = useCallback(
		(
			entity: EntityData,
			position: GridPosition,
			event: React.PointerEvent<HTMLDivElement>,
		) => {
			const isDraggable = isItemData(entity) && entity.draggable;
			const isClickable = isEntityClickable(entity);
			if (!isDraggable && !isClickable) {
				return;
			}

			event.preventDefault();
			pendingInteractionRef.current = {
				entity,
				position,
				startX: event.clientX,
				startY: event.clientY,
				element: event.currentTarget,
				rect: event.currentTarget.getBoundingClientRect(),
			};
		},
		[isEntityClickable],
	);

	// Click vs drag detection: starts drag only after movement exceeds threshold.
	// If pointerup fires before threshold, treats it as a click.
	useEffect(() => {
		const handlePointerMove = (event: PointerEvent) => {
			const pending = pendingInteractionRef.current;
			if (!pending) return;

			const dx = event.clientX - pending.startX;
			const dy = event.clientY - pending.startY;
			if (
				Math.abs(dx) > CLICK_THRESHOLD_PX ||
				Math.abs(dy) > CLICK_THRESHOLD_PX
			) {
				const isDraggable =
					isItemData(pending.entity) && pending.entity.draggable;
				if (!isDraggable) {
					// Entity is clickable but not draggable — cancel interaction
					pendingInteractionRef.current = null;
					return;
				}

				// Movement exceeded threshold — start the drag now
				pendingInteractionRef.current = null;

				setLastDropResult(null);
				setDraggingEntityId(pending.entity.id);
				setActiveDrag({
					source: "grid",
					sourceSpaceId: space.id,
					data: {
						entityId: pending.entity.id,
						entityType: pending.entity.type,
						entityName: pending.entity.name,
						isReposition: true,
						fromPosition: pending.position,
					},
					element: pending.element,
					initialRect: pending.rect,
				});
			}
		};

		const handlePointerUp = () => {
			const pending = pendingInteractionRef.current;
			pendingInteractionRef.current = null;

			if (!pending) return;

			// Pointer released without significant movement — treat as click
			if (onEntityClick && isEntityClickable(pending.entity)) {
				onEntityClick(pending.entity, pending.position);
			}
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [
		onEntityClick,
		isEntityClickable,
		setActiveDrag,
		setLastDropResult,
		space.id,
	]);

	// Handle drag over the board
	useEffect(() => {
		if (!activeDrag || !boardRef.current) {
			setDragPreview(null);
			setHoveredCell(null);
			return;
		}
		console.log(
			"[GridSpaceView] drag effect active for space:",
			space.id,
			"entity:",
			activeDrag.data.entityId,
		);

		const element = boardRef.current;

		const handlePointerMove = (event: PointerEvent) => {
			const rect = element.getBoundingClientRect();
			const isInside =
				event.clientX >= rect.left &&
				event.clientX <= rect.right &&
				event.clientY >= rect.top &&
				event.clientY <= rect.bottom;

			if (!isInside) {
				setDragPreview(null);
				setHoveredCell(null);
				hoveredCellRef.current = null;
				targetSpaceIdRef.current = undefined;
				return;
			}

			targetSpaceIdRef.current = space.id;

			// Calculate grid position
			const relX = event.clientX - rect.left;
			const relY = event.clientY - rect.top;
			const col = Math.floor(relX / stepX);
			const row = Math.floor(relY / stepY);

			// Check bounds
			if (row < 0 || row >= rows || col < 0 || col >= cols) {
				setDragPreview(null);
				setHoveredCell(null);
				hoveredCellRef.current = null;
				return;
			}

			setHoveredCell({ row, col });
			hoveredCellRef.current = { row, col };

			// Check if placement is valid
			const isValid = canPlaceAt
				? canPlaceAt(activeDrag.data.entityId, { row, col }, space.id)
				: true;

			// Show preview
			setDragPreview({
				x: col * stepX,
				y: row * stepY,
				width: cellWidth,
				height: cellHeight,
				valid: isValid,
				entityType: activeDrag.data.entityType,
			});
		};

		const handlePointerUp = () => {
			const currentHoveredCell = hoveredCellRef.current;
			console.log(
				"[GridSpaceView] handlePointerUp",
				"space:",
				space.id,
				"hoveredCell:",
				currentHoveredCell,
				"activeDrag:",
				activeDrag?.data?.entityId,
			);
			if (!currentHoveredCell) {
				console.log(
					"[GridSpaceView] no hoveredCell for space:",
					space.id,
					"- skipping (not target)",
				);
				// Don't cancel drag here - another GridSpaceView may be the target
				return;
			}

			const fromPosition = activeDrag.data.fromPosition ?? null;

			// Attempt to place the entity
			console.log(
				"[GridSpaceView] calling onPlaceEntity",
				"entityId:",
				activeDrag.data.entityId,
				"from:",
				fromPosition,
				"to:",
				currentHoveredCell,
				"hasCallback:",
				!!onPlaceEntity,
			);
			const placed = onPlaceEntity
				? onPlaceEntity(
						activeDrag.data.entityId,
						fromPosition,
						currentHoveredCell,
					)
				: false;
			console.log("[GridSpaceView] onPlaceEntity result:", placed);

			setLastDropResult({
				source: activeDrag.source,
				placed,
			});

			// Clear drag preview
			setDragPreview(null);
			setHoveredCell(null);
			hoveredCellRef.current = null;

			// Set drop animation target for successful placements
			if (placed && boardRef.current) {
				const boardRect = boardRef.current.getBoundingClientRect();
				const targetX = boardRect.left + currentHoveredCell.col * stepX;
				const targetY = boardRect.top + currentHoveredCell.row * stepY;

				setDropAnimationTarget({
					entityId: activeDrag.data.entityId,
					x: targetX,
					y: targetY,
					width: cellWidth,
					height: cellHeight,
				});
				// Note: draggingEntityId will be cleared by DragOverlay after animation
			} else {
				// Failed drop - clear immediately
				setActiveDrag(null);
				setDraggingEntityId(null);
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
		stepX,
		stepY,
		cellWidth,
		cellHeight,
		rows,
		cols,
		canPlaceAt,
		onPlaceEntity,
		setActiveDrag,
		setLastDropResult,
		setDropAnimationTarget,
		targetSpaceIdRef,
		space.id,
	]);

	const setEntityRef = useCallback(
		(entityId: string) => (el: HTMLDivElement | null) => {
			if (el) {
				entityRefs.current.set(entityId, el);
			} else {
				entityRefs.current.delete(entityId);
			}
		},
		[],
	);

	// Handle animation completion - fade in placed entity
	useEffect(() => {
		if (!dropAnimationTarget && draggingEntityId) {
			// Animation just completed - fade in the placed entity
			const entityEl = entityRefs.current.get(draggingEntityId);
			if (entityEl) {
				gsap.fromTo(
					entityEl,
					{ autoAlpha: 0 },
					{
						autoAlpha: 1,
						duration: 0.2,
						onComplete: () => {
							setDraggingEntityId(null);
						},
					},
				);
			} else {
				setDraggingEntityId(null);
			}
		}
	}, [dropAnimationTarget, draggingEntityId]);

	return (
		<Box
			className="grid-space-view"
			data-space-id={space.id}
			bg="gray.950"
			p={{ base: 2, md: 4 }}
			overflow="visible"
			position="relative"
			display="flex"
			flexDirection="column"
			gap={3}
		>
			{title && (
				<Flex align="center" justify="space-between" mb={{ base: 0, md: 4 }}>
					<Text
						fontSize={{ base: "xs", md: "sm" }}
						fontWeight="bold"
						color="gray.200"
					>
						{title}
					</Text>
				</Flex>
			)}

			<Box
				ref={boardRef}
				position="relative"
				display="grid"
				data-space-id={space.id}
				gridTemplateColumns={`repeat(${cols}, minmax(0, 1fr))`}
				gridTemplateRows={`repeat(${rows}, ${cellHeight}px)`}
				gridAutoFlow={orientation === "vertical" ? "column" : "row"}
				gap={2}
			>
				{/* Render grid cells */}
				{gridCells.map((cell) => {
					const item = entitiesByPosition.get(cell.key);
					const isHovered =
						hoveredCell?.row === cell.row && hoveredCell?.col === cell.col;
					const borderColor =
						isHovered && dragPreview
							? dragPreview.valid
								? "cyan.400"
								: "red.400"
							: "gray.700";

					return (
						<GridCell
							key={cell.key}
							borderColor={borderColor}
							showBorder={true}
							isOccupied={Boolean(item)}
							height={cellHeight}
						/>
					);
				})}

				{/* Render placed entities */}
				{entities.map(({ entity, position }) => {
					const isBeingAnimated = dropAnimationTarget?.entityId === entity.id;
					const isDragging = draggingEntityId === entity.id || isBeingAnimated;
					const statusInfo = getEntityStatus(entity);

					return (
						<PlacedEntity
							key={entity.id}
							entity={entity}
							x={position.col * stepX}
							y={position.row * stepY}
							width={cellWidth}
							height={cellHeight}
							isDragging={isDragging}
							status={statusInfo.status}
							statusMessage={statusInfo.message}
							onPointerDown={(event) =>
								handleEntityPointerDown(entity, position, event)
							}
							entityRef={setEntityRef(entity.id)}
						/>
					);
				})}

				{/* Drag preview */}
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
							{dragPreview.entityType}
						</Text>
					</Box>
				)}
			</Box>
		</Box>
	);
};
