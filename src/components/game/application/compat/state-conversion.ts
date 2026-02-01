/**
 * Compatibility layer for converting between new GameState (Spaces/Entities)
 * and old GameState (puzzle/inventory) format.
 *
 * This is a temporary bridge to support old UI components during the migration.
 * These functions should be removed once all components are updated.
 */

import type {
	Block,
	BoardItemLocation,
	BoardItemStatus,
	InventoryGroup,
	Item as LegacyItem,
	PuzzleConfig,
	PuzzleState,
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
 * Convert a GridSpace to the old PuzzleState format.
 * This allows old components to work with the new Space architecture.
 */
export function spaceToPuzzleState(
	space: SpaceData,
	entities: Record<string, EntityData>,
	puzzleId?: string,
): PuzzleState {
	// Check if it's a GridSpace and extract its properties
	if (!isGridSpace(space)) {
		// Return empty puzzle state for non-grid spaces
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
	const placedItems: BoardItemLocation[] = [];

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
	const config: PuzzleConfig = {
		id: space.id,
		puzzleId: puzzleId || space.id,
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
				: Object.keys(space.entityPositions ?? {});

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
 * Get a specific puzzle (GridSpace) from the state by ID.
 * Falls back to the first GridSpace if not found.
 */
export function getPuzzleById(
	spaces: Record<string, SpaceData>,
	entities: Record<string, EntityData>,
	puzzleId?: string,
): PuzzleState {
	if (puzzleId) {
		const space = spaces[puzzleId];
		if (space) {
			return spaceToPuzzleState(space, entities, puzzleId);
		}
	}

	// Find first grid space
	for (const [id, space] of Object.entries(spaces)) {
		if (isGridSpace(space)) {
			return spaceToPuzzleState(space, entities, id);
		}
	}

	// Return empty puzzle if no grid spaces found
	return {
		config: { id: "default", size: [0, 0] },
		blocks: [],
		placedItems: [],
		selectedBlock: null,
	};
}

/**
 * Get all puzzles (GridSpaces) from the state.
 */
export function getAllPuzzles(
	spaces: Record<string, SpaceData>,
	entities: Record<string, EntityData>,
): Record<string, PuzzleState> {
	const puzzles: Record<string, PuzzleState> = {};

	for (const [id, space] of Object.entries(spaces)) {
		if (isGridSpace(space)) {
			puzzles[id] = spaceToPuzzleState(space, entities, id);
		}
	}

	return puzzles;
}

/**
 * Create a compatibility wrapper for old components.
 * This wraps the new GameState to look like the old one.
 */
export function createCompatState(
	state: GameState,
	puzzleId?: string,
): {
	puzzle: PuzzleState;
	puzzles: Record<string, PuzzleState>;
	inventory: { groups: InventoryGroup[] };
} {
	return {
		puzzle: getPuzzleById(state.spaces, state.entities, puzzleId),
		puzzles: getAllPuzzles(state.spaces, state.entities),
		inventory: entitiesToInventory(state.spaces, state.entities),
	};
}
