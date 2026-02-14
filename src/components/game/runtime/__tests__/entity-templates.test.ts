import { describe, expect, it, vi } from "vitest";

import type { ItemDataConfig } from "../../domain/entity/entity-data";
import type { EntityTemplate, SpawnPlan } from "../behavior/entity-templates";
import {
	executeSpawnPlan,
	executeSpawnPlans,
	stampBatch,
	stampTemplate,
} from "../behavior/entity-templates";

const baseTemplate: EntityTemplate = {
	allowedPlaces: ["inventory", "board"],
	icon: { icon: "cpu" },
	tooltip: { content: "A test item" },
	draggable: true,
	data: { speed: 10 },
};

describe("stampTemplate", () => {
	it("creates config with given ID", () => {
		const result = stampTemplate(baseTemplate, "item-1");
		expect(result.id).toBe("item-1");
		expect(result.allowedPlaces).toEqual(["inventory", "board"]);
		expect(result.draggable).toBe(true);
		expect(result.data).toEqual({ speed: 10 });
	});

	it("merges overrides", () => {
		const result = stampTemplate(baseTemplate, "item-2", {
			draggable: false,
			allowedPlaces: ["board"],
		});
		expect(result.draggable).toBe(false);
		expect(result.allowedPlaces).toEqual(["board"]);
	});

	it("deep-merges data overrides", () => {
		const result = stampTemplate(baseTemplate, "item-3", {
			data: { color: "red" },
		});
		expect(result.data).toEqual({ speed: 10, color: "red" });
	});
});

describe("stampBatch", () => {
	it("creates sequential IDs", () => {
		const results = stampBatch(baseTemplate, 3, "thread");
		expect(results).toHaveLength(3);
		expect(results.map((r) => r.id)).toEqual([
			"thread-0",
			"thread-1",
			"thread-2",
		]);
	});

	it("uses template idPrefix when no prefix given", () => {
		const template: EntityTemplate = {
			...baseTemplate,
			idPrefix: "proc",
		};
		const results = stampBatch(template, 2);
		expect(results.map((r) => r.id)).toEqual(["proc-0", "proc-1"]);
	});

	it("uses custom prefix over template idPrefix", () => {
		const template: EntityTemplate = {
			...baseTemplate,
			idPrefix: "proc",
		};
		const results = stampBatch(template, 2, "task");
		expect(results.map((r) => r.id)).toEqual(["task-0", "task-1"]);
	});

	it("applies per-item overrides", () => {
		const colors = ["red", "blue", "green"];
		const results = stampBatch(baseTemplate, 3, "item", (i) => ({
			data: { color: colors[i] },
		}));
		expect(results[0].data).toEqual({ speed: 10, color: "red" });
		expect(results[1].data).toEqual({ speed: 10, color: "blue" });
		expect(results[2].data).toEqual({ speed: 10, color: "green" });
	});
});

describe("executeSpawnPlan", () => {
	const makeWorld = () => ({
		createEntity: vi.fn(),
		addToSpace: vi.fn(),
	});

	it("calls createEntity and addToSpace", () => {
		const world = makeWorld();
		const plan: SpawnPlan = {
			config: { ...baseTemplate, id: "e-1" } as ItemDataConfig,
			spaceId: "board",
			position: { x: 0, y: 1 },
		};
		executeSpawnPlan(plan, world);
		expect(world.createEntity).toHaveBeenCalledWith(plan.config);
		expect(world.addToSpace).toHaveBeenCalledWith("e-1", "board", {
			x: 0,
			y: 1,
		});
	});

	it("skips addToSpace when no spaceId", () => {
		const world = makeWorld();
		const plan: SpawnPlan = {
			config: { ...baseTemplate, id: "e-2" } as ItemDataConfig,
		};
		executeSpawnPlan(plan, world);
		expect(world.createEntity).toHaveBeenCalledWith(plan.config);
		expect(world.addToSpace).not.toHaveBeenCalled();
	});
});

describe("executeSpawnPlans", () => {
	it("processes all plans in order", () => {
		const calls: string[] = [];
		const world = {
			createEntity: vi.fn((config: ItemDataConfig) =>
				calls.push(`create:${config.id}`),
			),
			addToSpace: vi.fn((id: string, space: string) =>
				calls.push(`place:${id}->${space}`),
			),
		};
		const plans: SpawnPlan[] = [
			{
				config: { ...baseTemplate, id: "a" } as ItemDataConfig,
				spaceId: "s1",
			},
			{
				config: { ...baseTemplate, id: "b" } as ItemDataConfig,
				spaceId: "s2",
			},
		];
		executeSpawnPlans(plans, world);
		expect(calls).toEqual([
			"create:a",
			"place:a->s1",
			"create:b",
			"place:b->s2",
		]);
	});
});
