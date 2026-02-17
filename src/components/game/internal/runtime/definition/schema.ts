/**
 * Schema-based validation and migration pipeline for QuestionDefinition.
 *
 * Provides versioned config validation with deterministic migration
 * so definition changes are predictable and safe.
 */

import type { QuestionDefinition } from "@/components/game/types/question";
import type { ValidationError } from "@/components/game/types/runtime";
import { validateDefinition } from "./validate";

export const CURRENT_SCHEMA_VERSION = 1;

export type DefinitionMigration = {
	from: number;
	to: number;
	migrate: (def: QuestionDefinition) => QuestionDefinition;
};

const migrations: DefinitionMigration[] = [];

export function registerMigration(migration: DefinitionMigration): void {
	migrations.push(migration);
	migrations.sort((a, b) => a.from - b.from);
}

export function migrateDefinition(def: QuestionDefinition): QuestionDefinition {
	let current = { ...def };
	let version = current.version ?? 1;

	const applicable = migrations.filter((m) => m.from >= version);
	for (const migration of applicable) {
		if (migration.from !== version) {
			break;
		}
		current = migration.migrate(current);
		version = migration.to;
	}

	current.version = version;
	return current;
}

export type SchemaValidationResult =
	| {
			ok: true;
			definition: QuestionDefinition;
	  }
	| {
			ok: false;
			errors: ValidationError[];
	  };

export function validateAndMigrateDefinition(
	def: QuestionDefinition,
): SchemaValidationResult {
	const migrated = migrateDefinition(def);

	const errors = validateDefinition(migrated);

	if (
		migrated.version !== undefined &&
		migrated.version > CURRENT_SCHEMA_VERSION
	) {
		errors.push({
			field: "version",
			message: `Definition version ${migrated.version} is newer than supported version ${CURRENT_SCHEMA_VERSION}`,
		});
	}

	if (errors.length > 0) {
		return { ok: false, errors };
	}

	return { ok: true, definition: migrated };
}
