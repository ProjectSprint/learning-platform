/**
 * Phase derivation selectors.
 *
 * Wraps resolvePhase from question-ast.ts for consistent API surface.
 */

import {
	type ConditionContext,
	type PhaseResolution,
	type PhaseRule,
	resolvePhase,
} from "../../domain/question/question-ast";

/**
 * Derive the next phase from rules + condition context.
 *
 * Thin wrapper over resolvePhase that takes explicit currentPhase and fallback.
 */
export function selectDerivedPhase<CK extends string>(
	rules: PhaseRule<CK>[],
	context: ConditionContext<CK>,
	currentPhase: string,
	fallbackPhase: string,
): PhaseResolution {
	return resolvePhase(rules, context, currentPhase, fallbackPhase);
}
