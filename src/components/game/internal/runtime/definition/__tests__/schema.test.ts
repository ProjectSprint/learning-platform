import { describe, expect, it } from "vitest";
import type { QuestionDefinition } from "@/components/game/types/question";
import { validateQuestionDefinition } from "../schema";

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

describe("validateQuestionDefinition", () => {
	it("returns ok for valid definition", () => {
		const def = minimalDefinition();
		const result = validateQuestionDefinition(def);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.definition).toBe(def);
		}
	});

	it("returns errors for invalid definition", () => {
		const def = minimalDefinition({
			meta: { id: "", title: "t", description: "d" },
		});
		const result = validateQuestionDefinition(def);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.some((e) => e.field === "meta.id")).toBe(true);
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
		const result = validateQuestionDefinition(def);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.some((e) => e.message.includes("Duplicate"))).toBe(
				true,
			);
		}
	});
});
