import { describe, expect, it } from "vitest";
import type { QuestionDefinition } from "@/components/game/types/question";
import {
	CURRENT_SCHEMA_VERSION,
	migrateDefinition,
	validateAndMigrateDefinition,
} from "../schema";

const minimalDefinition = (
	overrides?: Partial<QuestionDefinition>,
): QuestionDefinition => ({
	meta: { id: "test-q", title: "Test", description: "desc" },
	initialPhase: "setup",
	spaces: [],
	entities: [],
	phaseRules: [],
	...overrides,
});

describe("schema pipeline", () => {
	describe("migrateDefinition", () => {
		it("sets version to current when missing", () => {
			const def = minimalDefinition();
			const result = migrateDefinition(def);
			expect(result.version).toBe(CURRENT_SCHEMA_VERSION);
		});

		it("preserves version when already current", () => {
			const def = minimalDefinition({ version: CURRENT_SCHEMA_VERSION });
			const result = migrateDefinition(def);
			expect(result.version).toBe(CURRENT_SCHEMA_VERSION);
		});

		it("does not mutate the original definition", () => {
			const def = minimalDefinition();
			const result = migrateDefinition(def);
			expect(def.version).toBeUndefined();
			expect(result).not.toBe(def);
		});
	});

	describe("validateAndMigrateDefinition", () => {
		it("returns ok for valid definition", () => {
			const def = minimalDefinition();
			const result = validateAndMigrateDefinition(def);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.definition.version).toBe(CURRENT_SCHEMA_VERSION);
			}
		});

		it("returns errors for invalid definition", () => {
			const def = minimalDefinition({
				meta: { id: "", title: "t", description: "d" },
			});
			const result = validateAndMigrateDefinition(def);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.errors.some((e) => e.field === "meta.id")).toBe(true);
			}
		});

		it("returns error for version newer than supported", () => {
			const def = minimalDefinition({
				version: CURRENT_SCHEMA_VERSION + 1,
			});
			const result = validateAndMigrateDefinition(def);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.errors.some((e) => e.field === "version")).toBe(true);
			}
		});

		it("returns errors for duplicate space IDs", () => {
			const def = minimalDefinition({
				spaces: [
					{
						kind: "pool",
						config: { id: "dup", name: "Pool 1" },
					},
					{
						kind: "pool",
						config: { id: "dup", name: "Pool 2" },
					},
				],
			});
			const result = validateAndMigrateDefinition(def);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.errors.some((e) => e.message.includes("Duplicate"))).toBe(
					true,
				);
			}
		});
	});
});
