import type { MutableRefObject } from "react";
import type { EntityVisual, ItemData, ItemDataConfig } from "./entity";
import type { ModalInstance } from "./modal";
import type { QuestionDefinition } from "./question";
import type { GridPosition } from "./space";
import type { Action, GameEvent, GameState } from "./state";

export type RuntimeApiSuccess = { ok: true };

export type RuntimeApiFailure = {
	ok: false;
	error: {
		message: string;
	};
};

export type RuntimeApiResult = RuntimeApiSuccess | RuntimeApiFailure;

export type ExecutionFlowIntent = {
	type: "execution_flow.phase_transition_requested";
	payload: { phase: string; source: string };
};

export type ExecutionFlowWarningEmitter = (message: string) => void;

export type ExecutionFlowDispatcher = {
	dispatchIntent: (intent: ExecutionFlowIntent) => RuntimeApiResult;
};

export type ExecutionFlowDispatcherDeps = {
	dispatch: (action: Action) => void;
	getState: () => GameState;
	nowMs: () => number;
	warn: ExecutionFlowWarningEmitter;
};

export type InteractionSessionIntent =
	| {
			type: "interaction_session.open_modal";
			payload: { modal: ModalInstance };
	  }
	| {
			type: "interaction_session.close_modal";
			payload: { modalId?: string };
	  }
	| {
			type: "interaction_session.set_terminal_visible";
			payload: { visible: boolean };
	  }
	| {
			type: "interaction_session.set_modal_gate_open";
			payload: { open: boolean };
	  }
	| {
			type: "interaction_session.request_phase_transition";
			payload: { phase: string; source: string };
	  };

export type ProgressIntent =
	| {
			type: "progress.complete_question";
	  }
	| {
			type: "progress.set_question";
			payload: { id: string; status?: "in_progress" | "completed" };
	  };

export type WorldIntent =
	| {
			type: "world.create_entity";
			payload: { config: ItemDataConfig };
	  }
	| {
			type: "world.update_entity";
			payload: {
				entityId: string;
				updates: {
					name?: string;
					data?: Record<string, unknown>;
					visual?: Record<string, unknown>;
				};
			};
	  }
	| {
			type: "world.update_entity_state";
			payload: { entityId: string; state: Record<string, unknown> };
	  }
	| {
			type: "world.delete_entities";
			payload: { entityIds: string[] };
	  }
	| {
			type: "world.add_to_space";
			payload: {
				entityId: string;
				spaceId: string;
				position?: GridPosition;
			};
	  }
	| {
			type: "world.remove_from_space";
			payload: { entityId: string; spaceId: string };
	  }
	| {
			type: "world.move_entity";
			payload: {
				entityId: string;
				toSpaceId: string;
				position?: GridPosition;
			};
	  }
	| {
			type: "world.move_entity_to_grid";
			payload: { entityId: string; spaceId: string };
	  };

export type Commands = {
	createEntity: (config: ItemDataConfig) => ItemData;
	updateEntity: (
		entityId: string,
		updates: {
			name?: string;
			data?: Record<string, unknown>;
			visual?: Partial<EntityVisual>;
		},
	) => void;
	updateEntityState: (entityId: string, state: Record<string, unknown>) => void;
	deleteEntities: (entityIds: string[]) => void;
	addToSpace: (
		entityId: string,
		spaceId: string,
		position?: GridPosition,
	) => void;
	removeFromSpace: (entityId: string, spaceId: string) => void;
	moveEntity: (
		entityId: string,
		toSpaceId: string,
		position?: GridPosition,
	) => void;
	moveEntityToGrid: (entityId: string, spaceId: string) => boolean;
	completeQuestion: () => void;
	openModal: (modal: ModalInstance) => void;
	closeModal: (modalId?: string) => void;
};

export type CommandContext = {
	dispatch: (action: Action) => void;
	getState: () => GameState;
};

export type ValidationError = {
	field: string;
	message: string;
};

export type ExecutionFlowApi = {
	requestPhaseTransition: (phase: string, source: string) => RuntimeApiResult;
	dispatchIntent: (intent: ExecutionFlowIntent) => RuntimeApiResult;
};

export type InteractionSessionState = {
	terminalVisible: boolean;
	modalGateOpen: boolean;
};

export type InteractionSessionApi = {
	openModal: (modal: ModalInstance) => RuntimeApiResult;
	closeModal: (modalId?: string) => RuntimeApiResult;
	requestPhaseTransition: (phase: string, source: string) => RuntimeApiResult;
	setTerminalVisible: (visible: boolean) => RuntimeApiResult;
	setModalGateOpen: (open: boolean) => RuntimeApiResult;
};

export type ProgressApi = {
	completeQuestion: () => RuntimeApiResult;
	setQuestion: (input: {
		id: string;
		status?: "in_progress" | "completed";
	}) => RuntimeApiResult;
};

export type WorldApi = {
	createEntity: (config: ItemDataConfig) => RuntimeApiResult;
	updateEntity: (
		entityId: string,
		updates: {
			name?: string;
			data?: Record<string, unknown>;
			visual?: Record<string, unknown>;
		},
	) => RuntimeApiResult;
	updateEntityState: (
		entityId: string,
		state: Record<string, unknown>,
	) => RuntimeApiResult;
	deleteEntities: (entityIds: string[]) => RuntimeApiResult;
	addToSpace: (
		entityId: string,
		spaceId: string,
		position?: GridPosition,
	) => RuntimeApiResult;
	removeFromSpace: (entityId: string, spaceId: string) => RuntimeApiResult;
	moveEntity: (
		entityId: string,
		toSpaceId: string,
		position?: GridPosition,
	) => RuntimeApiResult;
	moveEntityToGrid: (entityId: string, spaceId: string) => RuntimeApiResult;
};

export type QuestionRuntime<TContext = Record<string, never>> = {
	world: WorldApi;
	progress: ProgressApi;
	executionFlow: ExecutionFlowApi;
	interactionSession: InteractionSessionApi;
	interactionState: InteractionSessionState;
	state: GameState;
	phase: string;
	isCompleted: boolean;
	events: GameEvent[];
	ack: () => void;
	behaviorContext: TContext;
	registerTerminalFinish: MutableRefObject<(() => void) | null>;
};

export type BootstrapQuestion = <
	ConditionKey extends string = string,
	TContext = Record<string, never>,
>(
	definition: QuestionDefinition<ConditionKey, TContext>,
	dispatch: (action: Action) => void,
) => void;
