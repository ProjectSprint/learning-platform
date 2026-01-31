/**
 * PoolSpaceView component.
 * Renders a PoolSpace with its entities.
 * Similar to InventoryPanel but works with the Space/Entity model.
 *
 * Displays entities in a flex layout (grid, list, or carousel).
 * Supports drag and drop interactions.
 */

import { Box, Flex, Text } from "@chakra-ui/react";
import { useCallback, useMemo, useRef } from "react";
import type { Entity } from "../../domain/entity/Entity";
import type { PoolSpace } from "../../domain/space/PoolSpace";
import { EntityCard } from "../entity/EntityCard";
import { useDragContext } from "../interaction/drag/DragContext";
import { useEntityCardSize } from "../interaction/drag/DragOverlay";

/**
 * Props for the PoolSpaceView component.
 */
export type PoolSpaceViewProps = {
	/** The pool space to render */
	space: PoolSpace;
	/** Entities currently in this space */
	entities: Entity[];
	/** Entities that are placed in other spaces (to show as empty slots) */
	placedEntityIds?: Set<string>;
	/** Optional title for the space */
	title?: string;
	/** Callback when an entity is clicked for dragging */
	onEntityDragStart?: (entity: Entity, event: React.PointerEvent) => void;
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
}: PoolSpaceViewProps) => {
	const { activeDrag } = useDragContext();
	const entityRefs = useRef<Map<string, HTMLDivElement>>(new Map());
	const cardSize = useEntityCardSize();

	// Check if an entity is currently placed elsewhere
	const isEntityPlaced = useCallback(
		(entityId: string): boolean => {
			return placedEntityIds.has(entityId);
		},
		[placedEntityIds],
	);

	// Handle pointer down for drag start
	const handlePointerDown = useCallback(
		(entity: Entity, event: React.PointerEvent<HTMLDivElement>) => {
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

	if (entities.length === 0) {
		return null;
	}

	return (
		<Box
			className="pool-space-view"
			data-space-id={space.id}
			data-first-empty-slot={firstEmptySlot}
			bg="gray.900"
			borderTop="1px solid"
			borderColor="gray.800"
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
