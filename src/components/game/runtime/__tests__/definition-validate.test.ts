import { describe, expect, it } from "vitest";
import type { QuestionDefinition } from "../definition/types";
import { validateDefinition } from "../definition/validate";

const baseDefinition: QuestionDefinition = {
	meta: {
		id: "test-question",
		title: "Test",
		description: "Test description",
	},
	initialPhase: "setup",
	spaces: [{ kind: "pool", config: { id: "inventory", name: "Inventory" } }],
	entities: [
		{
			config: {
				id: "item-1",
				name: "Item 1",
				allowedPlaces: ["inventory"],
				data: { type: "item" },
			},
			initialSpace: "inventory",
		},
	],
	phaseRules: [],
};

describe("validateDefinition", () => {
	it("returns no errors for a valid definition", () => {
		expect(validateDefinition(baseDefinition)).toEqual([]);
	});

	it("reports duplicate space ids", () => {
		const errors = validateDefinition({
			...baseDefinition,
			spaces: [
				{ kind: "pool", config: { id: "inventory", name: "Inventory A" } },
				{ kind: "pool", config: { id: "inventory", name: "Inventory B" } },
			],
		});

		expect(errors.some((error) => error.field.includes("spaces[1]"))).toBe(
			true,
		);
	});

	it("reports entity initialSpace that references unknown space", () => {
		const errors = validateDefinition({
			...baseDefinition,
			entities: [
				{
					config: {
						id: "item-1",
						name: "Item 1",
						allowedPlaces: ["inventory"],
						data: { type: "item" },
					},
					initialSpace: "missing-space",
				},
			],
		});

		expect(
			errors.some((error) => error.field === "entities[0].initialSpace"),
		).toBe(true);
	});
});
