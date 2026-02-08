/**
 * Game engine event types.
 * Events are emitted by reducers to provide deterministic transitions.
 */

import type { GamePhase, ModalInstance } from "../../../core/types";
import type { EntityData } from "../../../domain/entity/entity-data";

export type GameEventBase = {
	/** Monotonic event identifier */
	eventId: number;
	/** Monotonic action identifier for grouping events */
	actionId: number;
	/** Epoch timestamp in ms when event was created */
	timestamp?: number;
};

export type EntityEnteredSpaceEvent = GameEventBase & {
	type: "ENTITY_ENTERED_SPACE";
	entityId: string;
	spaceId: string;
	position?: Record<string, unknown>;
};

export type EntityLeftSpaceEvent = GameEventBase & {
	type: "ENTITY_LEFT_SPACE";
	entityId: string;
	spaceId: string;
	position?: Record<string, unknown>;
};

export type EntityMovedEvent = GameEventBase & {
	type: "ENTITY_MOVED";
	entityId: string;
	fromSpaceId: string;
	toSpaceId: string;
	fromPosition?: Record<string, unknown>;
	toPosition?: Record<string, unknown>;
};

export type EntityUpdatePayload = {
	name?: EntityData["name"];
	draggable?: boolean;
	visual?: EntityData["visual"];
	data?: EntityData["data"];
	state?: EntityData["state"];
};

export type EntityUpdatedEvent = GameEventBase & {
	type: "ENTITY_UPDATED";
	entityId: string;
	updates: EntityUpdatePayload;
};

export type ModalCloseReason =
	| "backdrop"
	| "escape"
	| "button"
	| "programmatic"
	| "unknown";

export type ModalOpenedEvent = GameEventBase & {
	type: "MODAL_OPENED";
	modalId: string;
	modal: ModalInstance;
};

export type ModalSubmittedEvent = GameEventBase & {
	type: "MODAL_SUBMITTED";
	modalId: string;
	modalActionId: string;
	values: Record<string, unknown>;
};

export type ModalClosedEvent = GameEventBase & {
	type: "MODAL_CLOSED";
	modalId: string;
	modal?: ModalInstance;
	reason?: ModalCloseReason;
};

export type TerminalInputEvent = GameEventBase & {
	type: "TERMINAL_INPUT";
	entryId: string;
	input: string;
};

export type EngineStartedEvent = GameEventBase & {
	type: "ENGINE_STARTED";
	engineId?: string;
};

export type EngineFinishedEvent = GameEventBase & {
	type: "ENGINE_FINISHED";
	engineId?: string;
};

export type PhaseChangedEvent = GameEventBase & {
	type: "PHASE_CHANGED";
	from: GamePhase;
	to: GamePhase;
};

export type GameEvent =
	| EntityEnteredSpaceEvent
	| EntityLeftSpaceEvent
	| EntityMovedEvent
	| EntityUpdatedEvent
	| ModalOpenedEvent
	| ModalSubmittedEvent
	| ModalClosedEvent
	| TerminalInputEvent
	| EngineStartedEvent
	| EngineFinishedEvent
	| PhaseChangedEvent;

export type GameEventQueue = {
	events: GameEvent[];
	lastEventId: number;
	lastActionId: number;
};
