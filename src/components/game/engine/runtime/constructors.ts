/**
 * Constructor functions for game system definitions.
 *
 * These are identity functions — they return their input unchanged — but their
 * generic signatures drive TypeScript inference so that consumers get full type
 * safety without needing to import the corresponding `*For` type aliases.
 *
 * Usage (in a question's behaviors.ts):
 *
 *   const rule = BehaviorRule<MyCtx, MySpec>({ id: "...", on: ..., handler: ... })
 *   export const MY_BEHAVIORS = BehaviorDefinition<MyCtx, MySpec>({ initialContext, rules })
 *
 * Usage (in a question's definition.ts):
 *
 *   export const MY_DEFINITION = QuestionDefinition<MySpec>({ meta, spaces, ... })
 */

import type {
	BehaviorDefinitionFor,
	BehaviorRuleFor,
	TriggerSpec,
} from "../../types/behavior";
import type {
	QuestionDefinitionFor,
	QuestionTypeSpec,
} from "../../types/question";

export function BehaviorRule<TContext, TSpec extends TriggerSpec>(
	input: BehaviorRuleFor<TContext, TSpec>,
): BehaviorRuleFor<TContext, TSpec> {
	return input;
}

export function BehaviorDefinition<TContext, TSpec extends TriggerSpec>(
	input: BehaviorDefinitionFor<TContext, TSpec>,
): BehaviorDefinitionFor<TContext, TSpec> {
	return input;
}

export function QuestionDefinition<TSpec extends QuestionTypeSpec>(
	input: QuestionDefinitionFor<TSpec>,
): QuestionDefinitionFor<TSpec> {
	return input;
}
