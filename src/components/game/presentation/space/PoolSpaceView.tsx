/**
 * PoolSpaceView component.
 * Renders a PoolSpace with its entities.
 * Similar to InventoryPanel but works with the Space/Entity model.
 *
 * Displays entities in a flex layout (grid, list, or carousel).
 * Supports drag and drop interactions.
 */

import { Box, Flex, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EntityData } from "../../domain/entity/entity-data";
import type { PoolSpaceData } from "../../domain/space/space-data";
import { EntityCard } from "../entity/EntityCard";
import { useDragContext } from "../interaction/drag/DragContext";
import { useEntityCardSize } from "../interaction/drag/DragOverlay";

/**
 * Props for the PoolSpaceView component.
 */
export type PoolSpaceViewProps = {
	/** The pool space to render */
	space: PoolSpaceData;
	/** Entities currently in this space */
	entities: EntityData[];
	/** Entities that are placed in other spaces (to show as empty slots) */
	placedEntityIds?: Set<string>;
	/** Optional title for the space */
	title?: string;
	/** Callback when an entity is clicked for dragging */
	onEntityDragStart?: (entity: EntityData, event: React.PointerEvent) => void;
	/** Callback when an entity is returned to the pool */
	onEntityReturn?: (entityId: string) => boolean;
};

/**
 * PoolSpaceView component.
 * Renders entities in a pool space with drag and drop support.
 *
 * Visual design matches the current InventoryPanel component.
 *
 * @example
 * ```tsx
 * <PoolSpaceView
 *   space={poolSpace}
 *   entities={entities}
 *   title="Inventory"
 *   onEntityDragStart={handleDragStart}
 * />
 * ```
 */
export const PoolSpaceView = ({
	space,
	entities,
	placedEntityIds = new Set(),
	title,
	onEntityDragStart,
	onEntityReturn,
}: PoolSpaceViewProps) => {
	const { activeDrag, setActiveDrag, targetSpaceIdRef, setLastDropResult } =
		useDragContext();
	const entityRefs = useRef<Map<string, HTMLDivElement>>(new Map());
	const cardSize = useEntityCardSize();
	const poolRef = useRef<HTMLDivElement | null>(null);
	const [isHovered, setIsHovered] = useState(false);
	const isHoveredRef = useRef(false);

	// Check if an entity is currently placed elsewhere
	const isEntityPlaced = useCallback(
		(entityId: string): boolean => {
			return placedEntityIds.has(entityId);
		},
		[placedEntityIds],
	);

	// Handle pointer down for drag start
	const handlePointerDown = useCallback(
		(entity: EntityData, event: React.PointerEvent<HTMLDivElement>) => {
			// Check if entity is draggable
			if ("draggable" in entity && entity.draggable === false) {
				return;
			}

			if (onEntityDragStart) {
				onEntityDragStart(entity, event);
			}
		},
		[onEntityDragStart],
	);

	// Create ref callback for entity elements
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

	// Find first empty slot (entity that's placed elsewhere)
	const firstEmptySlot = useMemo(() => {
		return entities.find((entity) => isEntityPlaced(entity.id))?.id ?? null;
	}, [entities, isEntityPlaced]);

	// Handle drag over the pool for returning entities
	useEffect(() => {
		if (!activeDrag || !poolRef.current || !onEntityReturn) {
			setIsHovered(false);
			return;
		}

		// Only handle drags from grid (not from pool itself)
		if (activeDrag.source === "pool") {
			setIsHovered(false);
			return;
		}

		const element = poolRef.current;

		const handlePointerMove = (event: PointerEvent) => {
			const rect = element.getBoundingClientRect();
			const isInside =
				event.clientX >= rect.left &&
				event.clientX <= rect.right &&
				event.clientY >= rect.top &&
				event.clientY <= rect.bottom;

			if (isInside) {
				setIsHovered(true);
				isHoveredRef.current = true;
				targetSpaceIdRef.current = space.id;
			} else {
				setIsHovered(false);
				isHoveredRef.current = false;
				if (targetSpaceIdRef.current === space.id) {
					targetSpaceIdRef.current = undefined;
				}
			}
		};

		const handlePointerUp = () => {
			if (!isHoveredRef.current) {
				return;
			}

			// Attempt to return entity to pool
			const returned = onEntityReturn(activeDrag.data.entityId);

			setLastDropResult({
				source: activeDrag.source,
				placed: returned,
			});

			setIsHovered(false);
			isHoveredRef.current = false;

			if (returned) {
				// Successful return - clear drag (no animation for pool)
				setActiveDrag(null);
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
		onEntityReturn,
		setActiveDrag,
		setLastDropResult,
		targetSpaceIdRef,
		space.id,
	]);

	return (
		<Box
			ref={poolRef}
			className="pool-space-view"
			data-space-id={space.id}
			data-first-empty-slot={firstEmptySlot}
			bg="gray.900"
			borderTop="1px solid"
			borderColor={isHovered ? "cyan.500" : "gray.800"}
			p={{ base: 2, md: 3 }}
			overflow="visible"
		>
			{title && (
				<Text fontSize="sm" fontWeight="bold" mb={3} color="gray.200">
					{title}
				</Text>
			)}

			<Flex
				as="ul"
				role="list"
				direction="row"
				gap={2}
				wrap="wrap"
				align="center"
				justify="center"
				w="full"
				listStyleType="none"
				p={0}
				m={0}
			>
				{entities.length === 0 ? (
					<Text fontSize="sm" color="gray.500">
						No items.
					</Text>
				) : (
					entities.map((entity) => {
						const isInPool = !isEntityPlaced(entity.id);
						const isDragging =
							activeDrag?.source === "pool" &&
							activeDrag.data.entityId === entity.id;

						return (
							<EntityCard
								key={entity.id}
								entity={entity}
								isEmpty={!isInPool}
								isDragging={isDragging}
								width={cardSize.width}
								height={cardSize.height}
								onPointerDown={(e) => handlePointerDown(entity, e)}
								cardRef={setEntityRef(entity.id)}
							/>
						);
					})
				)}
			</Flex>
		</Box>
	);
};
