/**
 * Commands interface — high-level typed API for world mutations.
 *
 * Commands are the ONLY way question pages should mutate world state.
 * Each command maps internally to one or more fact-style actions dispatched
 * through the game reducer.
 */

import type {
	EntityVisual,
	ItemData,
	ItemDataConfig,
} from "../../domain/entity/entity-data";
import type { GridPosition } from "../../domain/space/space-data";
import type { ModalInstance } from "../../presentation/modal";

export type Commands = {
	// ── Entity ──────────────────────────────────────────────────────────
	/** Create a new item entity and add it to the world. */
	createEntity(config: ItemDataConfig): ItemData;

	/** Update an entity's name, data, or visual properties. */
	updateEntity(
		entityId: string,
		updates: {
			name?: string;
			data?: Record<string, unknown>;
			visual?: Partial<EntityVisual>;
		},
	): void;

	/** Merge key-value pairs into an entity's state. */
	updateEntityState(entityId: string, state: Record<string, unknown>): void;

	/** Delete multiple entities by ID. */
	deleteEntities(entityIds: string[]): void;

	// ── Space-entity ───────────────────────────────────────────────────
	/** Add an entity to a space at an optional grid position. */
	addToSpace(entityId: string, spaceId: string, position?: GridPosition): void;

	/** Remove an entity from a specific space. */
	removeFromSpace(entityId: string, spaceId: string): void;

	/** Move an entity to a new space (auto-removes from current space). */
	moveEntity(
		entityId: string,
		toSpaceId: string,
		position?: GridPosition,
	): void;

	/**
	 * Move an entity to a grid space at the first available empty position.
	 * Returns true if an empty position was found, false if the grid is full.
	 */
	moveEntityToGrid(entityId: string, spaceId: string): boolean;

	/** Mark the question as completed. */
	completeQuestion(): void;

	// ── Modal ──────────────────────────────────────────────────────────
	/** Open a modal dialog. */
	openModal(modal: ModalInstance): void;

	/** Close a modal (by ID, or close the topmost modal if no ID given). */
	closeModal(modalId?: string): void;
};
