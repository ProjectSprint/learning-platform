/**
 * Migration utilities.
 * Converts between old GameState format and new domain-driven format.
 */

import type {
	BoardItemStatus,
	InventoryGroup,
	Item as LegacyItem,
	GameState as OldGameState,
	PuzzleSize,
	PuzzleState,
} from "../../core/types";
import { Item } from "../../domain/entity";
import { GridSpace } from "../../domain/space";
import type { GameState as NewGameState } from "./types";

/**
 * Extracts rows and cols from PuzzleSize.
 * PuzzleSize can be [rows, cols] or an object with breakpoint sizes.
 */
const extractGridSize = (
	size: PuzzleSize | Partial<Record<string, PuzzleSize>>,
): { rows: number; cols: number } => {
	// If it's an array, use it directly
	if (Array.isArray(size)) {
		return { rows: size[0], cols: size[1] };
	}

	// If it's an object, use the base size or first available size
	if (typeof size === "object") {
		const sizeRecord = size as Partial<Record<string, PuzzleSize>>;
		const baseSize = sizeRecord.base;
		if (Array.isArray(baseSize)) {
			return { rows: baseSize[0], cols: baseSize[1] };
		}

		// Fall back to first available size
		const firstSize = Object.values(sizeRecord).find(Array.isArray);
		if (Array.isArray(firstSize)) {
			return { rows: firstSize[0], cols: firstSize[1] };
		}
	}

	// Default fallback
	return { rows: 10, cols: 10 };
};

/**
 * Converts old GameState to new GameState format.
 * This enables gradual migration from the old state structure to the new one.
 *
 * @param oldState The old game state
 * @returns The new game state
 */
export const migrateOldToNew = (oldState: OldGameState): NewGameState => {
	const spaces = new Map();
	const entities = new Map();

	// Migrate inventory groups to entities
	for (const group of oldState.inventory.groups) {
		for (const itemConfig of group.items) {
			// Create Item entity
			const entity = new Item({
				id: itemConfig.id,
				name: itemConfig.name,
				icon: itemConfig.icon,
				data: {
					...itemConfig.data,
					type: itemConfig.type,
					inventoryGroup: group.id,
				},
				tooltip: itemConfig.tooltip,
				allowedPlaces: itemConfig.allowedPlaces,
			});

			entities.set(entity.id, entity);
		}

		// Create a PoolSpace for each inventory group
		// (We'll implement PoolSpace in the domain layer)
		// For now, we'll skip creating inventory spaces
	}

	// Migrate puzzle to GridSpace
	const puzzle = oldState.puzzle;
	const puzzleId = puzzle.config.puzzleId ?? puzzle.config.id ?? "puzzle";
	const gridSize = extractGridSize(puzzle.config.size);

	const gridSpace = new GridSpace({
		id: puzzleId,
		name: puzzle.config.title,
		rows: gridSize.rows,
		cols: gridSize.cols,
		metrics: {
			cellWidth: 64,
			cellHeight: 64,
			gapX: 4,
			gapY: 4,
		},
		maxCapacity: puzzle.config.maxItems,
		metadata: {},
	});

	// Add placed items to the grid
	for (const placedItem of puzzle.placedItems) {
		const entity = entities.get(placedItem.itemId);
		if (entity) {
			// Update entity state with placed item data
			entity.updateState({
				status: placedItem.status,
				...placedItem.data,
			});

			// Add to grid space
			gridSpace.add(entity, { row: placedItem.blockY, col: placedItem.blockX });
		}
	}

	spaces.set(puzzleId, gridSpace);

	// Migrate additional puzzles if they exist
	if (oldState.puzzles) {
		for (const [id, puzzleState] of Object.entries(oldState.puzzles)) {
			const additionalGridSize = extractGridSize(puzzleState.config.size);
			const additionalGridSpace = new GridSpace({
				id,
				name: puzzleState.config.title,
				rows: additionalGridSize.rows,
				cols: additionalGridSize.cols,
				metrics: {
					cellWidth: 64,
					cellHeight: 64,
					gapX: 4,
					gapY: 4,
				},
				maxCapacity: puzzleState.config.maxItems,
				metadata: {},
			});

			// Add placed items
			for (const placedItem of puzzleState.placedItems) {
				const entity = entities.get(placedItem.itemId);
				if (entity) {
					entity.updateState({
						status: placedItem.status,
						...placedItem.data,
					});

					additionalGridSpace.add(entity, {
						row: placedItem.blockY,
						col: placedItem.blockX,
					});
				}
			}

			spaces.set(id, additionalGridSpace);
		}
	}

	return {
		phase: oldState.phase,
		spaces,
		entities,
		arrows: oldState.arrows,
		terminal: oldState.terminal,
		hint: oldState.hint,
		overlay: oldState.overlay,
		question: oldState.question,
		sequence: oldState.sequence,
	};
};

/**
 * Converts new GameState back to old GameState format.
 * This enables backward compatibility during migration.
 *
 * @param newState The new game state
 * @returns The old game state
 */
export const migrateNewToOld = (newState: NewGameState): OldGameState => {
	// Group entities by their inventory group
	const inventoryGroups = new Map<string, InventoryGroup>();

	// Collect all entities and organize them
	for (const entity of newState.entities.values()) {
		const groupId =
			(entity.data.inventoryGroup as string | undefined) ?? "default";

		if (!inventoryGroups.has(groupId)) {
			inventoryGroups.set(groupId, {
				id: groupId,
				title: groupId,
				visible: true,
				items: [],
			});
		}

		const group = inventoryGroups.get(groupId);
		if (!group) {
			continue;
		}

		const legacyItem: LegacyItem = {
			id: entity.id,
			type: entity.type,
			name: entity.name,
			data: entity.data,
			tooltip:
				entity instanceof Item
					? entity.tooltip
					: (entity.data.tooltip as LegacyItem["tooltip"]),
			allowedPlaces: (() => {
				if (entity instanceof Item) {
					return entity.allowedPlaces;
				}
				const allowed = entity.data.allowedPlaces;
				return Array.isArray(allowed) ? (allowed as string[]) : [];
			})(),
		};

		if (entity instanceof Item && entity.icon) {
			legacyItem.icon = entity.icon;
		}

		group.items.push(legacyItem);
	}

	// Find the primary puzzle space
	let primaryPuzzle: PuzzleState | null = null;
	const additionalPuzzles: Record<string, PuzzleState> = {};

	for (const space of newState.spaces.values()) {
		if (space instanceof GridSpace) {
			// Convert grid to blocks format
			const blocks = Array(space.rows)
				.fill(null)
				.map((_, row) =>
					Array(space.cols)
						.fill(null)
						.map((_, col) => {
							const entityIds = space.getEntitiesAt({ row, col });
							return {
								x: col,
								y: row,
								status:
									entityIds.length > 0
										? ("occupied" as const)
										: ("empty" as const),
								itemId: entityIds[0],
							};
						}),
				);

			const puzzleState: PuzzleState = {
				config: {
					id: space.id,
					puzzleId: space.id,
					title: space.name,
					size: [space.rows, space.cols] as PuzzleSize,
					maxItems: space.maxCapacity,
				},
				blocks,
				placedItems: space.getEntities().map((entity) => {
					const pos = space.getPosition(entity);
					return {
						id: entity.id,
						itemId: entity.id,
						type: entity.type,
						blockX: (pos && "col" in pos ? pos.col : 0) as number,
						blockY: (pos && "row" in pos ? pos.row : 0) as number,
						status: entity.getStateValue<BoardItemStatus>("status") ?? "normal",
						data: entity.data,
					};
				}),
				selectedBlock: null,
			};

			if (!primaryPuzzle) {
				primaryPuzzle = puzzleState;
			} else {
				additionalPuzzles[space.id] = puzzleState;
			}
		}
	}

	// Create default puzzle if none exists
	const resolvedPrimaryPuzzle =
		primaryPuzzle ??
		({
			config: {
				id: "puzzle",
				puzzleId: "puzzle",
				title: "Puzzle",
				size: [10, 10] as PuzzleSize,
			},
			blocks: Array(10)
				.fill(null)
				.map((_, row) =>
					Array(10)
						.fill(null)
						.map((_, col) => ({
							x: col,
							y: row,
							status: "empty" as const,
						})),
				),
			placedItems: [],
			selectedBlock: null,
		} satisfies PuzzleState);

	return {
		phase: newState.phase,
		inventory: {
			groups: Array.from(inventoryGroups.values()),
		},
		puzzle: resolvedPrimaryPuzzle,
		puzzles:
			Object.keys(additionalPuzzles).length > 0 ? additionalPuzzles : undefined,
		arrows: newState.arrows,
		terminal: newState.terminal,
		hint: newState.hint,
		overlay: newState.overlay,
		question: newState.question,
		sequence: newState.sequence,
	};
};

/**
 * Checks if a state object is the old format.
 *
 * @param state The state to check
 * @returns True if it's the old format
 */
export const isOldState = (state: unknown): state is OldGameState => {
	if (!state || typeof state !== "object") {
		return false;
	}

	const candidate = state as { inventory?: { groups?: unknown } };
	return Array.isArray(candidate.inventory?.groups);
};

/**
 * Checks if a state object is the new format.
 *
 * @param state The state to check
 * @returns True if it's the new format
 */
export const isNewState = (state: unknown): state is NewGameState => {
	if (!state || typeof state !== "object") {
		return false;
	}

	const candidate = state as {
		spaces?: unknown;
		entities?: unknown;
	};

	return (
		candidate.spaces instanceof Map && candidate.entities instanceof Map
	);
};

/**
 * Normalizes a state object to the new format.
 * Automatically detects the format and migrates if necessary.
 *
 * @param state The state to normalize
 * @returns The state in new format
 */
export const normalizeState = (
	state: OldGameState | NewGameState,
): NewGameState => {
	if (isNewState(state)) {
		return state;
	}
	if (isOldState(state)) {
		return migrateOldToNew(state);
	}
	throw new Error("Invalid state format");
};
