/**
 * Schema validation for QuestionDefinition.
 *
 * Pre-launch: all definition changes are hard migrations (just change the type).
 * Versioned migration pipeline will be re-added post-launch when needed.
 */

import type { QuestionDefinition } from "@/components/game/types/question";
import type { ValidationError } from "@/components/game/types/runtime";
import { validateDefinition } from "./validate";

export type SchemaValidationResult =
	| {
			ok: true;
			definition: QuestionDefinition;
	  }
	| {
			ok: false;
			errors: ValidationError[];
	  };

export function validateQuestionDefinition(
	def: QuestionDefinition,
): SchemaValidationResult {
	const errors = validateDefinition(def);

	if (errors.length > 0) {
		return { ok: false, errors };
	}

	return { ok: true, definition: def };
}
