/**
 * EntityCard component.
 * Generic entity display component for rendering entities in a space.
 * Similar to the inventory slot rendering in InventoryPanel but works with the Entity model.
 *
 * This component is used for displaying entities in pool spaces (like inventory).
 */

import { Box, Flex, Text } from "@chakra-ui/react";
import { Icon } from "@iconify/react";
import type { Entity } from "../../domain/entity/Entity";
import type { Item, ItemTooltip } from "../../domain/entity/Item";
import { InfoTooltip } from "../../ui/help";

/**
 * Props for the EntityCard component.
 */
export type EntityCardProps = {
	/** The entity to render */
	entity: Entity;
	/** Whether the entity is currently being dragged */
	isDragging?: boolean;
	/** Whether the entity slot should appear empty (entity placed elsewhere) */
	isEmpty?: boolean;
	/** Width of the card in pixels */
	width: number;
	/** Height of the card in pixels */
	height: number;
	/** Callback for pointer down event (for drag interactions) */
	onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
	/** Ref callback for the card element */
	cardRef?: React.RefCallback<HTMLDivElement>;
};

/**
 * EntityCard component.
 * Renders an entity as a card with icon, name, and optional tooltip.
 *
 * Visual design matches the current InventorySlot component.
 *
 * @example
 * ```tsx
 * <EntityCard
 *   entity={entity}
 *   width={150}
 *   height={64}
 *   isDragging={false}
 *   onPointerDown={(e) => handleDragStart(e)}
 * />
 * ```
 */
export const EntityCard = ({
	entity,
	isDragging = false,
	isEmpty = false,
	width,
	height,
	onPointerDown,
	cardRef,
}: EntityCardProps) => {
	// Check if this is an Item entity (has draggable property)
	const isItem = "draggable" in entity;
	const item = isItem ? (entity as Item) : null;
	const isNonDraggable = item?.draggable === false;

	// Get display properties
	const displayName = entity.name ?? entity.type;
	const iconInfo = item?.icon ?? entity.visual.icon;
	const tooltip = item?.tooltip as ItemTooltip | undefined;

	return (
		<Box
			ref={cardRef}
			as="li"
			role="listitem"
			data-entity-id={entity.id}
			data-entity-type={entity.type}
			aria-grabbed={isDragging}
			width={`${width}px`}
			height={`${height}px`}
			bg={isEmpty ? "transparent" : "gray.800"}
			border="1px"
			borderStyle={isEmpty ? "dashed" : "solid"}
			borderColor={
				isEmpty ? "gray.700" : isNonDraggable ? "gray.600" : "cyan.500"
			}
			borderRadius="md"
			display="flex"
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			gap={1}
			opacity={isDragging ? 0.3 : isNonDraggable ? 0.6 : 1}
			cursor={isEmpty ? "default" : isNonDraggable ? "not-allowed" : "grab"}
			transition="opacity 0.1s ease"
			style={{ touchAction: "none" }}
			onPointerDown={isEmpty ? undefined : onPointerDown}
		>
			{!isEmpty && (
				<>
					{iconInfo && typeof iconInfo === "object" && "icon" in iconInfo && (
						<Icon
							icon={iconInfo.icon}
							width={20}
							height={20}
							color={iconInfo.color}
						/>
					)}
					<Flex align="center" gap={1}>
						<Text fontSize="xs" fontWeight="bold" color="gray.100">
							{displayName}
						</Text>
						{tooltip && (
							<InfoTooltip
								content={tooltip.content}
								seeMoreHref={tooltip.seeMoreHref}
							/>
						)}
					</Flex>
				</>
			)}
		</Box>
	);
};
