/**
 * Application layer state types.
 * These types represent the new domain-driven state structure using plain data.
 */

import type {
	Arrow,
	GamePhase,
	HintState,
	OverlayState,
	QuestionStatus,
	TerminalState,
} from "../../../core/types";
import type { EntityData } from "../../../domain/entity/entity-data";
import type { SpaceData } from "../../../domain/space/space-data";
import type { GameEventQueue } from "./events";

/**
 * New GameState type using plain domain data.
 * Uses Record instead of Map for Immer compatibility.
 */
export type GameState = {
	/** Current phase of the game */
	phase: GamePhase;

	/** All spaces in the game, keyed by space ID */
	spaces: Record<string, SpaceData>;

	/** All entities in the game, keyed by entity ID */
	entities: Record<string, EntityData>;

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

	/** Ordered engine events for deterministic transitions */
	eventQueue: GameEventQueue;

	/** Per-engine cursor for acknowledged events */
	eventCursors: Record<string, number>;
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

export type {
	GameEvent,
	GameEventQueue,
	ModalCloseReason,
} from "./events";
