/**
 * Validation for QuestionDefinition.
 *
 * Catches common authoring mistakes at bootstrap time rather than
 * letting them silently produce broken state.
 */

import type { QuestionDefinition } from "./types";

export type ValidationError = {
	field: string;
	message: string;
};

/**
 * Validates a QuestionDefinition and returns any errors found.
 *
 * Checks:
 * - meta.id is non-empty
 * - space IDs are unique
 * - entity initial spaces reference valid space IDs
 */
export function validateDefinition<CK extends string = string, TC = unknown>(
	def: QuestionDefinition<CK, TC>,
): ValidationError[] {
	const errors: ValidationError[] = [];

	// meta.id must be non-empty
	if (!def.meta.id || def.meta.id.trim().length === 0) {
		errors.push({ field: "meta.id", message: "meta.id must be non-empty" });
	}

	// Collect space IDs and check uniqueness
	const spaceIds = new Set<string>();
	for (let i = 0; i < def.spaces.length; i++) {
		const id = def.spaces[i].config.id;
		if (spaceIds.has(id)) {
			errors.push({
				field: `spaces[${i}].config.id`,
				message: `Duplicate space ID: "${id}"`,
			});
		}
		spaceIds.add(id);
	}

	// Entities must reference valid space IDs
	for (let i = 0; i < def.entities.length; i++) {
		const entity = def.entities[i];
		if (entity.initialSpace && !spaceIds.has(entity.initialSpace)) {
			errors.push({
				field: `entities[${i}].initialSpace`,
				message: `Entity references unknown space: "${entity.initialSpace}"`,
			});
		}
	}

	return errors;
}
