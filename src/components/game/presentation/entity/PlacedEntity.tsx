/**
 * PlacedEntity component.
 * Renders an entity that has been placed in a space (typically on a grid).
 * Similar to PlacedItemCard but works with the Entity model.
 *
 * This component handles the visual representation of entities positioned
 * in grid spaces, including status indicators and icons.
 */

import { Box, Text } from "@chakra-ui/react";
import { Icon } from "@iconify/react";
import { memo, type RefCallback } from "react";
import type { Entity } from "../../domain/entity/Entity";
import type { Item } from "../../domain/entity/Item";

/**
 * Status type for placed entities.
 */
export type EntityStatus = "success" | "warning" | "error" | "info" | undefined;

/**
 * Props for the PlacedEntity component.
 */
export type PlacedEntityProps = {
	/** The entity to render */
	entity: Entity;
	/** X position in pixels */
	x: number;
	/** Y position in pixels */
	y: number;
	/** Width in pixels */
	width: number;
	/** Height in pixels */
	height: number;
	/** Whether the entity is currently being dragged */
	isDragging: boolean;
	/** Optional status of the entity */
	status?: EntityStatus;
	/** Optional status message to display */
	statusMessage?: string | null;
	/** Pointer down handler for drag interactions */
	onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
	/** Ref callback for the entity element */
	entityRef?: RefCallback<HTMLDivElement>;
};

/**
 * Gets the badge background color for a status.
 */
const getStatusBadgeColor = (status?: EntityStatus): string => {
	if (status === "error") return "red.600";
	if (status === "warning") return "yellow.600";
	if (status === "success") return "green.600";
	if (status === "info") return "blue.600";
	return "gray.600";
};

/**
 * Gets the border color for a status.
 */
const getStatusBorderColor = (status?: EntityStatus): string => {
	if (status === "error") return "red.500";
	if (status === "warning") return "yellow.500";
	if (status === "success") return "green.500";
	if (status === "info") return "blue.500";
	return "gray.500";
};

/**
 * PlacedEntity component.
 * Renders an entity positioned in a space with optional status indicators.
 *
 * Visual design matches the current PlacedItemCard component.
 *
 * @example
 * ```tsx
 * <PlacedEntity
 *   entity={entity}
 *   x={100}
 *   y={50}
 *   width={150}
 *   height={60}
 *   isDragging={false}
 *   status="success"
 *   statusMessage="Connected"
 * />
 * ```
 */
export const PlacedEntity = memo(
	({
		entity,
		x,
		y,
		width,
		height,
		isDragging,
		status,
		statusMessage,
		onPointerDown,
		entityRef,
	}: PlacedEntityProps) => {
		// Get display properties
		const displayName = entity.name ?? entity.type;

		// Check if this is an Item entity
		const isItem = "icon" in entity && entity.icon !== undefined;
		const item = isItem ? (entity as Item) : null;
		const iconInfo = item?.icon ?? entity.visual.icon;

		return (
			<Box
				ref={entityRef}
				position="absolute"
				top={`${y}px`}
				left={`${x}px`}
				width={`${width}px`}
				height={`${height}px`}
				bg="gray.800"
				border="1px solid"
				borderColor={getStatusBorderColor(status)}
				borderRadius="md"
				display="flex"
				flexDirection="row"
				alignItems="center"
				justifyContent="center"
				gap={2}
				px={3}
				cursor="grab"
				zIndex={isDragging ? 9999 : 1}
				style={{ touchAction: "none" }}
				onPointerDown={onPointerDown}
				aria-label={`${displayName}${statusMessage ? `: ${statusMessage}` : ""}`}
				data-entity-id={entity.id}
				data-entity-type={entity.type}
			>
				{iconInfo && typeof iconInfo === "object" && "icon" in iconInfo && (
					<Icon
						icon={iconInfo.icon}
						width={20}
						height={20}
						color={iconInfo.color}
					/>
				)}
				<Text fontSize="xs" fontWeight="bold" color="gray.100">
					{displayName}
				</Text>

				{statusMessage && (
					<Box
						position="absolute"
						top="-8px"
						right="-8px"
						fontSize="11px"
						px={1.5}
						py={0.5}
						borderRadius="full"
						bg={getStatusBadgeColor(status)}
						color="white"
						fontWeight="medium"
						boxShadow="sm"
						whiteSpace="nowrap"
					>
						{statusMessage}
					</Box>
				)}
			</Box>
		);
	},
	(prev, next) =>
		prev.entity.id === next.entity.id &&
		prev.x === next.x &&
		prev.y === next.y &&
		prev.width === next.width &&
		prev.height === next.height &&
		prev.isDragging === next.isDragging &&
		prev.status === next.status &&
		prev.statusMessage === next.statusMessage,
);

PlacedEntity.displayName = "PlacedEntity";
