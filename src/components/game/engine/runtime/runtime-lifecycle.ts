import { bootstrapQuestion as internalBootstrapQuestion } from "../../internal/runtime/bootstrap/bootstrap";
import { useQuestionRuntime as internalUseQuestionRuntime } from "../../internal/runtime/context/use-question-runtime";
import type { Action, QuestionDefinition } from "./types";

/**
 * Initializes question state deterministically from definition data.
 */
export const bootstrapQuestion = <
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
export const useQuestionRuntime = internalUseQuestionRuntime;
