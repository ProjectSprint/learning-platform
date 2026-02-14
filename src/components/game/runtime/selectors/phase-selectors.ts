/**
 * Phase derivation selectors.
 *
 * Wraps resolvePhase from question-ast.ts for consistent API surface.
 */

import type {
	ConditionContext,
	PhaseResolution,
	PhaseRule,
} from "../../domain/question/question-ast";
import { selectDerivedPhase as selectDerivedPhaseFromRead } from "../../domain/read";

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
	return selectDerivedPhaseFromRead(
		rules,
		context,
		currentPhase,
		fallbackPhase,
	);
}
