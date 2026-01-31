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
import type { Entity } from "../../domain/entity";
import { Item as ItemEntity } from "../../domain/entity";
import type { GridSpace, Space } from "../../domain/space";
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
	space: Space,
	entities: Map<string, Entity>,
	puzzleId?: string,
): PuzzleState {
	// Check if it's a GridSpace
	if (!(space as GridSpace).rows || !(space as GridSpace).cols) {
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

	const gridSpace = space as GridSpace;
	const rows = gridSpace.rows;
	const cols = gridSpace.cols;

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
	const spaceEntities = space.getEntities();
	const placedItems: BoardItemLocation[] = [];

	for (const entity of spaceEntities) {
		const resolvedEntity = entities.get(entity.id);
		if (!resolvedEntity) {
			continue;
		}

		const position = space.getPosition(resolvedEntity);
		if (!position || !("row" in position) || !("col" in position)) {
			continue;
		}

		const { row, col } = position as { row: number; col: number };

		// Mark block as occupied
		if (blocks[row]?.[col]) {
			blocks[row][col].status = "occupied";
			blocks[row][col].itemId = resolvedEntity.id;
		}

		const entityState = resolvedEntity.getState();
		const { status: rawStatus, ...restState } = entityState;
		const status = isBoardItemStatus(rawStatus) ? rawStatus : "normal";
		const iconFromVisual = resolvedEntity.visual?.icon
			? {
					icon: resolvedEntity.visual.icon,
					color: resolvedEntity.visual.color,
				}
			: undefined;
		const icon =
			resolvedEntity instanceof ItemEntity
				? resolvedEntity.icon
				: iconFromVisual;

		// Create placed item
		placedItems.push({
			id: resolvedEntity.id,
			itemId: resolvedEntity.id,
			type: resolvedEntity.type,
			blockX: col,
			blockY: row,
			status,
			icon,
			data: {
				...resolvedEntity.data,
				...restState,
			},
		});
	}

	// Extract config from space metadata
	const metadata = space.metadata || {};
	const config: PuzzleConfig = {
		id: space.id,
		puzzleId: puzzleId || space.id,
		title: (metadata.title as string | undefined) ?? space.name,
		size: [cols, rows],
		orientation: metadata.orientation as "horizontal" | "vertical" | undefined,
		maxItems: space.capacity()?.max,
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
	spaces: Map<string, Space>,
	entities: Map<string, Entity>,
): { groups: InventoryGroup[] } {
	const groups: InventoryGroup[] = [];

	// Find all pool spaces (typically used for inventory)
	for (const [spaceId, space] of spaces) {
		// Check if this is an inventory/pool space by metadata or type
		const isInventory =
			space.metadata?.isInventory ||
			space.id.includes("inventory") ||
			space.id.includes("pool");

		if (!isInventory) {
			continue;
		}

		// Get entities in this space
		const spaceEntities = space.getEntities();

		// Convert to legacy inventory items
		const items: LegacyItem[] = [];
		for (const entity of spaceEntities) {
			const resolvedEntity = entities.get(entity.id);
			if (!resolvedEntity) {
				continue;
			}

			if (resolvedEntity instanceof ItemEntity) {
				items.push(resolvedEntity.toLegacyItem());
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
	spaces: Map<string, Space>,
	entities: Map<string, Entity>,
	puzzleId?: string,
): PuzzleState {
	if (puzzleId) {
		const space = spaces.get(puzzleId);
		if (space) {
			return spaceToPuzzleState(space, entities, puzzleId);
		}
	}

	// Find first grid space
	for (const [id, space] of spaces) {
		if ((space as GridSpace).rows !== undefined) {
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
	spaces: Map<string, Space>,
	entities: Map<string, Entity>,
): Record<string, PuzzleState> {
	const puzzles: Record<string, PuzzleState> = {};

	for (const [id, space] of spaces) {
		if ((space as GridSpace).rows !== undefined) {
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
