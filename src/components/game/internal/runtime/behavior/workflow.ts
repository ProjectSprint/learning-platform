/**
 * Declarative workflow/state-machine for entity lifecycles.
 * Defines states, transitions, guards, and timed auto-transitions.
 */

/**
 * A single state in the workflow.
 */
export type WorkflowState = {
	/** Unique state name */
	name: string;
	/** Optional: automatically transition after this many ms */
	autoTransitionMs?: number;
	/** Where to auto-transition to */
	autoTransitionTo?: string;
};

/**
 * A transition between states.
 */
export type WorkflowTransition = {
	from: string;
	to: string;
	/** Optional guard: return true to allow this transition */
	guard?: (ctx: WorkflowTransitionContext) => boolean;
};

export type WorkflowTransitionContext = {
	readonly currentState: string;
	readonly entityData: Record<string, unknown>;
};

/**
 * Complete workflow definition.
 */
export type WorkflowDefinition = {
	/** Initial state name */
	initialState: string;
	/** All possible states */
	states: WorkflowState[];
	/** Allowed transitions (if empty, all transitions are allowed) */
	transitions?: WorkflowTransition[];
};

/**
 * Runtime state of a workflow instance.
 */
export type WorkflowInstance = {
	currentState: string;
	enteredAt: number;
	history: string[];
};

/**
 * Create a new workflow instance.
 */
export function createWorkflow(
	definition: WorkflowDefinition,
	nowMs?: number,
): WorkflowInstance {
	return {
		currentState: definition.initialState,
		enteredAt: nowMs ?? Date.now(),
		history: [definition.initialState],
	};
}

/**
 * Attempt a state transition. Returns new instance if successful, or same instance if transition is invalid.
 */
export function transitionWorkflow(
	instance: WorkflowInstance,
	definition: WorkflowDefinition,
	toState: string,
	ctx?: WorkflowTransitionContext,
	nowMs?: number,
): WorkflowInstance {
	if (!definition.states.some((s) => s.name === toState)) {
		return instance;
	}

	if (definition.transitions && definition.transitions.length > 0) {
		const transition = definition.transitions.find(
			(t) => t.from === instance.currentState && t.to === toState,
		);
		if (!transition) return instance;
		if (transition.guard && ctx && !transition.guard(ctx)) return instance;
	}

	return {
		currentState: toState,
		enteredAt: nowMs ?? Date.now(),
		history: [...instance.history, toState],
	};
}

/**
 * Check if a workflow instance should auto-transition based on elapsed time.
 * Returns the target state name if auto-transition is due, or undefined.
 */
export function checkAutoTransition(
	instance: WorkflowInstance,
	definition: WorkflowDefinition,
	nowMs?: number,
): string | undefined {
	const currentStateDef = definition.states.find(
		(s) => s.name === instance.currentState,
	);
	if (!currentStateDef?.autoTransitionMs || !currentStateDef.autoTransitionTo) {
		return undefined;
	}

	const elapsed = (nowMs ?? Date.now()) - instance.enteredAt;
	if (elapsed >= currentStateDef.autoTransitionMs) {
		return currentStateDef.autoTransitionTo;
	}
	return undefined;
}

/**
 * Validate a workflow definition for common errors.
 */
export function validateWorkflow(definition: WorkflowDefinition): string[] {
	const errors: string[] = [];
	const stateNames = new Set(definition.states.map((s) => s.name));

	if (!stateNames.has(definition.initialState)) {
		errors.push(
			`Initial state "${definition.initialState}" not found in states`,
		);
	}

	for (const state of definition.states) {
		if (state.autoTransitionTo && !stateNames.has(state.autoTransitionTo)) {
			errors.push(
				`State "${state.name}" auto-transitions to unknown state "${state.autoTransitionTo}"`,
			);
		}
		if (state.autoTransitionMs !== undefined && state.autoTransitionMs < 0) {
			errors.push(`State "${state.name}" has negative autoTransitionMs`);
		}
	}

	if (definition.transitions) {
		for (const transition of definition.transitions) {
			if (!stateNames.has(transition.from)) {
				errors.push(`Transition from unknown state "${transition.from}"`);
			}
			if (!stateNames.has(transition.to)) {
				errors.push(`Transition to unknown state "${transition.to}"`);
			}
		}
	}

	return errors;
}
