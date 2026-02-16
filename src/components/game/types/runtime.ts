import type { MutableRefObject } from "react";
import type { _EntityVisual, _ItemData, _ItemDataConfig } from "./entity";
import type { _ModalInstance } from "./modal";
import type { _QuestionDefinition } from "./question";
import type { _GridPosition } from "./space";
import type { Action, GameEvent, GameState } from "./state";

export type _RuntimeApiSuccess = { ok: true };

export type _RuntimeApiFailure = {
	ok: false;
	error: {
		message: string;
	};
};

export type _RuntimeApiResult = _RuntimeApiSuccess | _RuntimeApiFailure;

export type _ExecutionFlowIntent = {
	type: "execution_flow.phase_transition_requested";
	payload: { phase: string; source: string };
};

export type _ExecutionFlowWarningEmitter = (message: string) => void;

export type _ExecutionFlowDispatcher = {
	dispatchIntent: (intent: _ExecutionFlowIntent) => _RuntimeApiResult;
};

export type _ExecutionFlowDispatcherDeps = {
	dispatch: (action: Action) => void;
	getState: () => GameState;
	nowMs: () => number;
	warn: _ExecutionFlowWarningEmitter;
};

export type _InteractionSessionIntent =
	| {
			type: "interaction_session.open_modal";
			payload: { modal: _ModalInstance };
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

export type _ProgressIntent =
	| {
			type: "progress.complete_question";
	  }
	| {
			type: "progress.set_question";
			payload: { id: string; status?: "in_progress" | "completed" };
	  };

export type _WorldIntent =
	| {
			type: "world.create_entity";
			payload: { config: _ItemDataConfig };
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
				position?: _GridPosition;
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
				position?: _GridPosition;
			};
	  }
	| {
			type: "world.move_entity_to_grid";
			payload: { entityId: string; spaceId: string };
	  };

export type _Commands = {
	createEntity: (config: _ItemDataConfig) => _ItemData;
	updateEntity: (
		entityId: string,
		updates: {
			name?: string;
			data?: Record<string, unknown>;
			visual?: Partial<_EntityVisual>;
		},
	) => void;
	updateEntityState: (entityId: string, state: Record<string, unknown>) => void;
	deleteEntities: (entityIds: string[]) => void;
	addToSpace: (
		entityId: string,
		spaceId: string,
		position?: _GridPosition,
	) => void;
	removeFromSpace: (entityId: string, spaceId: string) => void;
	moveEntity: (
		entityId: string,
		toSpaceId: string,
		position?: _GridPosition,
	) => void;
	moveEntityToGrid: (entityId: string, spaceId: string) => boolean;
	completeQuestion: () => void;
	openModal: (modal: _ModalInstance) => void;
	closeModal: (modalId?: string) => void;
};

export type _CommandContext = {
	dispatch: (action: Action) => void;
	getState: () => GameState;
};

export type _ValidationError = {
	field: string;
	message: string;
};

export type _ExecutionFlowApi = {
	requestPhaseTransition: (phase: string, source: string) => _RuntimeApiResult;
	dispatchIntent: (intent: _ExecutionFlowIntent) => _RuntimeApiResult;
};

export type _InteractionSessionState = {
	terminalVisible: boolean;
	modalGateOpen: boolean;
};

export type _InteractionSessionApi = {
	openModal: (modal: _ModalInstance) => _RuntimeApiResult;
	closeModal: (modalId?: string) => _RuntimeApiResult;
	requestPhaseTransition: (phase: string, source: string) => _RuntimeApiResult;
	setTerminalVisible: (visible: boolean) => _RuntimeApiResult;
	setModalGateOpen: (open: boolean) => _RuntimeApiResult;
};

export type _ProgressApi = {
	completeQuestion: () => _RuntimeApiResult;
	setQuestion: (input: {
		id: string;
		status?: "in_progress" | "completed";
	}) => _RuntimeApiResult;
};

export type _WorldApi = {
	createEntity: (config: _ItemDataConfig) => _RuntimeApiResult;
	updateEntity: (
		entityId: string,
		updates: {
			name?: string;
			data?: Record<string, unknown>;
			visual?: Record<string, unknown>;
		},
	) => _RuntimeApiResult;
	updateEntityState: (
		entityId: string,
		state: Record<string, unknown>,
	) => _RuntimeApiResult;
	deleteEntities: (entityIds: string[]) => _RuntimeApiResult;
	addToSpace: (
		entityId: string,
		spaceId: string,
		position?: _GridPosition,
	) => _RuntimeApiResult;
	removeFromSpace: (entityId: string, spaceId: string) => _RuntimeApiResult;
	moveEntity: (
		entityId: string,
		toSpaceId: string,
		position?: _GridPosition,
	) => _RuntimeApiResult;
	moveEntityToGrid: (entityId: string, spaceId: string) => _RuntimeApiResult;
};

export type _QuestionRuntime<TContext = Record<string, never>> = {
	world: _WorldApi;
	progress: _ProgressApi;
	executionFlow: _ExecutionFlowApi;
	interactionSession: _InteractionSessionApi;
	interactionState: _InteractionSessionState;
	state: GameState;
	phase: string;
	isCompleted: boolean;
	events: GameEvent[];
	ack: () => void;
	behaviorContext: TContext;
	registerTerminalFinish: MutableRefObject<(() => void) | null>;
};

export type _BootstrapQuestion = <
	ConditionKey extends string = string,
	TContext = Record<string, never>,
>(
	definition: _QuestionDefinition<ConditionKey, TContext>,
	dispatch: (action: Action) => void,
) => void;

export type QuestionRuntime<TContext = Record<string, never>> =
	_QuestionRuntime<TContext>;
export type Commands = _Commands;
export type CommandContext = _CommandContext;
export type ExecutionFlowIntent = _ExecutionFlowIntent;
export type ExecutionFlowWarningEmitter = _ExecutionFlowWarningEmitter;
export type ExecutionFlowDispatcher = _ExecutionFlowDispatcher;
export type ExecutionFlowDispatcherDeps = _ExecutionFlowDispatcherDeps;
export type ExecutionFlowApi = _ExecutionFlowApi;
export type InteractionSessionIntent = _InteractionSessionIntent;
export type InteractionSessionState = _InteractionSessionState;
export type InteractionSessionApi = _InteractionSessionApi;
export type ProgressIntent = _ProgressIntent;
export type ProgressApi = _ProgressApi;
export type RuntimeApiFailure = _RuntimeApiFailure;
export type RuntimeApiResult = _RuntimeApiResult;
export type RuntimeApiSuccess = _RuntimeApiSuccess;
export type ValidationError = _ValidationError;
export type WorldIntent = _WorldIntent;
export type WorldApi = _WorldApi;
export type BootstrapQuestion = <
	ConditionKey extends string = string,
	TContext = Record<string, never>,
>(
	definition: _QuestionDefinition<ConditionKey, TContext>,
	dispatch: (action: Action) => void,
) => void;
