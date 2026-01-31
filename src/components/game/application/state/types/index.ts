/**
 * Application layer state types.
 * These types represent the new domain-driven state structure using Spaces and Entities.
 */

import type {
	Arrow,
	GamePhase,
	HintState,
	OverlayState,
	QuestionStatus,
	TerminalState,
} from "../../../core/types";
import type { Entity } from "../../../domain/entity";
import type { Space } from "../../../domain/space";

/**
 * New GameState type using domain models.
 * This is the refactored state structure that will replace the old GameState.
 */
export type GameState = {
	/** Current phase of the game */
	phase: GamePhase;

	/** All spaces in the game, keyed by space ID */
	spaces: Map<string, Space>;

	/** All entities in the game, keyed by entity ID */
	entities: Map<string, Entity>;

	/** Visual arrows connecting elements */
	arrows: Arrow[];

	/** Terminal state */
	terminal: TerminalState;

	/** Hint system state */
	hint: HintState;

	/** Modal/overlay state */
	overlay: OverlayState;

	/** Current question information */
	question: { id: string; status: QuestionStatus };

	/** Sequence number for updates */
	sequence: number;
};

/**
 * Helper type for entity placement in a space.
 */
export type EntityPlacement = {
	/** The entity being placed */
	entityId: string;
	/** The space to place it in */
	spaceId: string;
	/** Position within the space (interpretation depends on space type) */
	position?: Record<string, unknown>;
};

/**
 * Helper type for entity movement between spaces.
 */
export type EntityTransfer = {
	/** The entity being moved */
	entityId: string;
	/** Source space */
	fromSpaceId: string;
	/** Destination space */
	toSpaceId: string;
	/** Position in source space */
	fromPosition?: Record<string, unknown>;
	/** Position in destination space */
	toPosition?: Record<string, unknown>;
};
