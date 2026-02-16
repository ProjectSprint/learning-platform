import { bootstrapQuestion as internalBootstrapQuestion } from "../../internal/runtime/bootstrap/bootstrap";
import { useQuestionRuntime as internalUseQuestionRuntime } from "../../internal/runtime/context/use-question-runtime";
import { validateDefinition as internalValidateDefinition } from "../../internal/runtime/definition/validate";
import {
	createExecutionFlowApi,
	createInteractionSessionApi,
	createProgressApi,
	createWorldApi,
} from "../../internal/runtime/wrappers";
import type { Action, QuestionDefinition, ValidationError } from "./types";

/**
 * Validates a question definition at the engine boundary.
 */
export const validateQuestionDefinition = <
	ConditionKey extends string = string,
	TContext = Record<string, never>,
>(
	definition: QuestionDefinition<ConditionKey, TContext>,
): ValidationError[] => internalValidateDefinition(definition);

/**
 * Initializes question state deterministically from definition data.
 */
export const initializeQuestion = <
	ConditionKey extends string = string,
	TContext = Record<string, never>,
>(
	definition: QuestionDefinition<ConditionKey, TContext>,
	dispatch: (action: Action) => void,
): void => {
	internalBootstrapQuestion(definition, dispatch);
};

/**
 * Engine runtime entrypoint for question pages.
 */
export const useRuntime = internalUseQuestionRuntime;

// Compatibility aliases retained for current public API usage.
export const bootstrapQuestion = initializeQuestion;
export const useQuestionRuntime = useRuntime;
export const validateDefinition = validateQuestionDefinition;

export {
	createExecutionFlowApi,
	createInteractionSessionApi,
	createProgressApi,
	createWorldApi,
};
