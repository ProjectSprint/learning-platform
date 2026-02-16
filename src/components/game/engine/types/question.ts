import type {
	ConditionContext as __ConditionContext,
	PhaseResolution as __PhaseResolution,
} from "../../internal/domain/question";
import type {
	PhaseRule as __PhaseRule,
	QuestionDefinition as __QuestionDefinition,
} from "../../internal/runtime/definition/types";

type _ConditionContext<ConditionKey extends string = string> =
	__ConditionContext<ConditionKey>;
type _PhaseResolution = __PhaseResolution;
type _PhaseRule<ConditionKey extends string = string> =
	__PhaseRule<ConditionKey>;
type _QuestionDefinition<
	ConditionKey extends string = string,
	TContext = Record<string, never>,
> = __QuestionDefinition<ConditionKey, TContext>;

export type ConditionContext<ConditionKey extends string = string> =
	_ConditionContext<ConditionKey>;
export type PhaseResolution = _PhaseResolution;
export type PhaseRule<ConditionKey extends string = string> =
	_PhaseRule<ConditionKey>;
export type QuestionDefinition<
	ConditionKey extends string = string,
	TContext = Record<string, never>,
> = _QuestionDefinition<ConditionKey, TContext>;
