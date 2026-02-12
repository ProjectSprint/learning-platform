/**
 * Compatibility layer for converting between new GameState (Spaces/Entities)
 * and old GameState (space/inventory) format.
 *
 * This is a temporary bridge to support old UI components during the migration.
 * These functions should be removed once all components are updated.
 */

import type {
	Block,
	BoardItemStatus,
	InventoryGroup,
	Item as LegacyItem,
	SpaceConfig,
	SpaceItemLocation,
	SpaceState,
} from "../../core/types";
import type { EntityData } from "../../domain/entity/entity-data";
import { isItemData } from "../../domain/entity/entity-data";
import type { SpaceData } from "../../domain/space/space-data";
import { isGridSpace } from "../../domain/space/space-data";
import type { GameState } from "../state/types";

const isBoardItemStatus = (value: unknown): value is BoardItemStatus =>
	value === "normal" ||
	value === "warning" ||
	value === "success" ||
	value === "error";

/**
 * Convert a GridSpace to the old SpaceState format.
 * This allows old components to work with the new Space architecture.
 */
export function spaceToSpaceState(
	space: SpaceData,
	entities: Record<string, EntityData>,
): SpaceState {
	// Check if it's a GridSpace and extract its properties
	if (!isGridSpace(space)) {
		// Return empty space state for non-grid spaces
		return {
			config: {
				id: space.id,
				size: [0, 0],
			},
			blocks: [],
			placedItems: [],
			selectedBlock: null,
		};
	}

	const rows = space.rows;
	const cols = space.cols;

	// Create blocks grid
	const blocks: Block[][] = [];
	for (let y = 0; y < rows; y++) {
		const row: Block[] = [];
		for (let x = 0; x < cols; x++) {
			row.push({
				x,
				y,
				status: "empty",
			});
		}
		blocks.push(row);
	}

	// Get entities in this space
	const placedItems: SpaceItemLocation[] = [];

	for (const [entityId, position] of Object.entries(space.entityPositions)) {
		const entity = entities[entityId];
		if (!entity) {
			continue;
		}

		if (!("row" in position) || !("col" in position)) {
			continue;
		}

		const row = position.row;
		const col = position.col;

		// Mark block as occupied
		if (blocks[row]?.[col]) {
			blocks[row][col].status = "occupied";
			blocks[row][col].itemId = entity.id;
		}

		const entityState = entity.state;
		const { status: rawStatus, ...restState } = entityState;
		const status = isBoardItemStatus(rawStatus) ? rawStatus : "normal";
		const iconFromVisual = entity.visual?.icon
			? {
					icon: entity.visual.icon,
					color: entity.visual.color,
				}
			: undefined;
		const icon = isItemData(entity) ? entity.icon : iconFromVisual;

		// Create placed item
		placedItems.push({
			id: entity.id,
			itemId: entity.id,
			type: entity.type,
			blockX: col,
			blockY: row,
			status,
			icon,
			data: {
				...entity.data,
				...restState,
			},
		});
	}

	// Extract config from space metadata
	const metadata = space.metadata ?? {};
	const config: SpaceConfig = {
		id: space.id,
		title: (metadata.title as string | undefined) ?? space.name,
		size: [cols, rows],
		orientation: metadata.orientation as "horizontal" | "vertical" | undefined,
		maxItems: space.maxCapacity,
	};

	return {
		config,
		blocks,
		placedItems,
		selectedBlock: null,
	};
}

/**
 * Convert entities in PoolSpace(s) to old inventory format.
 * This allows old inventory components to work with the new Entity architecture.
 */
export function entitiesToInventory(
	spaces: Record<string, SpaceData>,
	entities: Record<string, EntityData>,
): { groups: InventoryGroup[] } {
	const groups: InventoryGroup[] = [];

	// Find all pool spaces (typically used for inventory)
	for (const [spaceId, space] of Object.entries(spaces)) {
		// Check if this is an inventory/pool space by metadata or type or kind
		const isInventory =
			space.metadata?.isInventory === true ||
			spaceId.includes("inventory") ||
			spaceId.includes("pool") ||
			space.kind === "pool";

		if (!isInventory) {
			continue;
		}

		// Get entities in this space based on space type
		const entityIdsInSpace: string[] =
			space.kind === "pool"
				? space.entityIds
				: space.kind === "grid"
					? Object.keys(space.entityPositions ?? {})
					: [];

		// Convert to legacy inventory items
		const items: LegacyItem[] = [];
		for (const entityId of entityIdsInSpace) {
			const resolvedEntity = entities[entityId];
			if (!resolvedEntity) {
				continue;
			}

			if (isItemData(resolvedEntity)) {
				items.push({
					id: resolvedEntity.id,
					type: resolvedEntity.type,
					name: resolvedEntity.name,
					allowedPlaces: resolvedEntity.allowedPlaces,
					icon: resolvedEntity.icon,
					tooltip: resolvedEntity.tooltip,
					data: resolvedEntity.data,
					draggable: resolvedEntity.draggable,
					category: resolvedEntity.category,
				});
				continue;
			}

			const allowedPlaces = Array.isArray(resolvedEntity.data?.allowedPlaces)
				? (resolvedEntity.data.allowedPlaces as string[])
				: [];
			const icon = resolvedEntity.visual?.icon
				? {
						icon: resolvedEntity.visual.icon,
						color: resolvedEntity.visual.color,
					}
				: undefined;
			const tooltip = resolvedEntity.data?.tooltip as
				| LegacyItem["tooltip"]
				| undefined;
			const draggable = resolvedEntity.data?.draggable as
				| LegacyItem["draggable"]
				| undefined;
			const category = resolvedEntity.data?.category as
				| LegacyItem["category"]
				| undefined;

			items.push({
				id: resolvedEntity.id,
				type: resolvedEntity.type,
				name: resolvedEntity.name,
				allowedPlaces,
				icon,
				tooltip,
				data: resolvedEntity.data,
				draggable,
				category,
			});
		}

		// Create inventory group
		groups.push({
			id: spaceId,
			title: (space.metadata?.title as string) ?? space.name ?? spaceId,
			visible:
				typeof space.metadata?.visible === "boolean"
					? (space.metadata.visible as boolean)
					: true,
			items,
		});
	}

	return { groups };
}

/**
 * Get a specific space (GridSpace) from the state by ID.
 * Falls back to the first GridSpace if not found.
 */
export function getSpaceById(
	spaces: Record<string, SpaceData>,
	entities: Record<string, EntityData>,
	spaceId?: string,
): SpaceState {
	if (spaceId) {
		const space = spaces[spaceId];
		if (space) {
			return spaceToSpaceState(space, entities);
		}
	}

	// Find first grid space
	for (const space of Object.values(spaces)) {
		if (isGridSpace(space)) {
			return spaceToSpaceState(space, entities);
		}
	}

	// Return empty space if no grid spaces found
	return {
		config: { id: "default", size: [0, 0] },
		blocks: [],
		placedItems: [],
		selectedBlock: null,
	};
}

/**
 * Get all spaces (GridSpaces) from the state.
 */
export function getAllSpaces(
	spaces: Record<string, SpaceData>,
	entities: Record<string, EntityData>,
): Record<string, SpaceState> {
	const spacesMap: Record<string, SpaceState> = {};

	for (const [id, space] of Object.entries(spaces)) {
		if (isGridSpace(space)) {
			spacesMap[id] = spaceToSpaceState(space, entities);
		}
	}

	return spacesMap;
}

/**
 * Create a compatibility wrapper for old components.
 * This wraps the new GameState to look like the old one.
 */
export function createCompatState(
	state: GameState,
	spaceId?: string,
): {
	space: SpaceState;
	spaces: Record<string, SpaceState>;
	inventory: { groups: InventoryGroup[] };
} {
	return {
		space: getSpaceById(state.spaces, state.entities, spaceId),
		spaces: getAllSpaces(state.spaces, state.entities),
		inventory: entitiesToInventory(state.spaces, state.entities),
	};
}
