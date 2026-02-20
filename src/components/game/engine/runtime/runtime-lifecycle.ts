import type { QuestionDefinition } from "@/components/game/types/question";
import type { Action } from "@/components/game/types/state";
import { bootstrapQuestion as internalBootstrapQuestion } from "../../internal/runtime/bootstrap/bootstrap";
import { useQuestionRuntime as internalUseQuestionRuntime } from "../../internal/runtime/context/use-question-runtime";

/**
 * Initializes question state deterministically from definition data.
 */
export const bootstrapQuestion = <TContext = unknown>(
	definition: QuestionDefinition<string, TContext>,
	dispatch: (action: Action) => void,
): void => {
	internalBootstrapQuestion(definition, dispatch);
};

/**
 * Engine runtime entrypoint for question pages.
 */
export const useQuestionRuntime = internalUseQuestionRuntime;
