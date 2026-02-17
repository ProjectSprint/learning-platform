import type { EntityData } from "./entity";
import type { ModalInstance, OverlayState } from "./modal";
import type { SpaceData, SpacePosition } from "./space";

export type QuestionStatus = "in_progress" | "completed";

export type GameEventBase = {
	eventId: number;
	actionId: number;
	timestamp?: number;
};

export type EntityEnteredSpaceEvent = GameEventBase & {
	type: "ENTITY_ENTERED_SPACE";
	entityId: string;
	spaceId: string;
	position?: SpacePosition;
};

export type EntityLeftSpaceEvent = GameEventBase & {
	type: "ENTITY_LEFT_SPACE";
	entityId: string;
	spaceId: string;
	position?: SpacePosition;
};

export type EntityMovedEvent = GameEventBase & {
	type: "ENTITY_MOVED";
	entityId: string;
	fromSpaceId: string;
	toSpaceId: string;
	fromPosition?: SpacePosition;
	toPosition?: SpacePosition;
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
	from: string;
	to: string;
};

export type EntityClickedEvent = GameEventBase & {
	type: "ENTITY_CLICKED";
	entityId: string;
	spaceId: string;
	position?: SpacePosition;
};

export type RuntimeWarningEvent = GameEventBase & {
	type: "RUNTIME_WARNING";
	message: string;
};

export type GameEvent =
	| EntityEnteredSpaceEvent
	| EntityLeftSpaceEvent
	| EntityMovedEvent
	| EntityUpdatedEvent
	| EntityClickedEvent
	| ModalOpenedEvent
	| ModalSubmittedEvent
	| ModalClosedEvent
	| TerminalInputEvent
	| EngineStartedEvent
	| EngineFinishedEvent
	| PhaseChangedEvent
	| RuntimeWarningEvent;

export type GameEventQueue = {
	events: GameEvent[];
	lastEventId: number;
	lastActionId: number;
};

export type GameEventInput = GameEvent extends infer Event
	? Event extends { eventId: number; actionId: number; timestamp?: number }
		? Omit<Event, "eventId" | "actionId" | "timestamp">
		: never
	: never;

export type GameState = {
	phase: string;
	spaces: Record<string, SpaceData>;
	entities: Record<string, EntityData>;
	overlay: OverlayState;
	question: { id: string; status: QuestionStatus };
	eventQueue: GameEventQueue;
	eventCursors: Record<string, number>;
};

export type EntityPlacement = {
	entityId: string;
	spaceId: string;
	position?: SpacePosition;
};

export type EntityTransfer = {
	entityId: string;
	fromSpaceId: string;
	toSpaceId: string;
	fromPosition?: SpacePosition;
	toPosition?: SpacePosition;
};

export type CoreAction =
	| {
			type: "SET_QUESTION";
			payload: {
				id: string;
				status?: QuestionStatus;
			};
	  }
	| { type: "SET_PHASE"; payload: { phase: string } }
	| { type: "COMPLETE_QUESTION" }
	| { type: "ACK_EVENTS"; payload: { engineId: string; cursor: number } }
	| {
			type: "EMIT_EVENTS";
			payload: {
				events: GameEventInput[];
			};
	  };

export type EntityCreatedAction = {
	type: "ENTITY_CREATED";
	payload: {
		entity: EntityData;
	};
};

export type EntityUpdatedAction = {
	type: "ENTITY_UPDATED";
	payload: {
		entityId: string;
		updates: EntityUpdatePayload;
	};
};

export type EntityStateUpdatedAction = {
	type: "ENTITY_STATE_UPDATED";
	payload: {
		entityId: string;
		state: Record<string, unknown>;
	};
};

export type EntitiesDeletedAction = {
	type: "ENTITIES_DELETED";
	payload: {
		entityIds: string[];
	};
};

export type EntityAction =
	| EntityCreatedAction
	| EntityUpdatedAction
	| EntityStateUpdatedAction
	| EntitiesDeletedAction;

export type SpaceCreatedAction = {
	type: "SPACE_CREATED";
	payload: {
		space: SpaceData;
	};
};

export type SpaceRemovedAction = {
	type: "SPACE_REMOVED";
	payload: {
		spaceId: string;
	};
};

export type EntityAddedAction = {
	type: "ENTITY_ADDED";
	payload: {
		entityId: string;
		spaceId: string;
		position?: SpacePosition;
	};
};

export type EntityRemovedAction = {
	type: "ENTITY_REMOVED";
	payload: {
		entityId: string;
		spaceId: string;
	};
};

export type EntityMovedAction = {
	type: "ENTITY_MOVED";
	payload: {
		entityId: string;
		fromSpaceId: string;
		toSpaceId: string;
		fromPosition?: SpacePosition;
		toPosition?: SpacePosition;
	};
};

export type EntityPositionUpdatedAction = {
	type: "ENTITY_POSITION_UPDATED";
	payload: {
		entityId: string;
		spaceId: string;
		position: SpacePosition;
	};
};

export type EntitiesSwappedAction = {
	type: "ENTITIES_SWAPPED";
	payload: {
		entity1Id: string;
		space1Id: string;
		entity2Id: string;
		space2Id: string;
	};
};

export type SpaceAction =
	| SpaceCreatedAction
	| SpaceRemovedAction
	| EntityAddedAction
	| EntityRemovedAction
	| EntityMovedAction
	| EntityPositionUpdatedAction
	| EntitiesSwappedAction;

export type ModalAction =
	| { type: "OPEN_MODAL"; payload: ModalInstance }
	| { type: "CLOSE_MODAL"; payload?: { modalId?: string } }
	| {
			type: "MODAL_SUBMITTED";
			payload: {
				modalId: string;
				modalActionId: string;
				values: Record<string, unknown>;
			};
	  };

export type UIAction = ModalAction;

export type ApplicationAction = SpaceAction | EntityAction;
export type Action = ApplicationAction | UIAction | CoreAction;
