import { describe, expect, it } from "vitest";
import type { StatusRule, StatusRuleContext } from "../behavior/status-rules";
import {
	delayedDelete,
	delayedMove,
	delayedUpdate,
	evaluateStatusRules,
} from "../behavior/status-rules";

const ctx: StatusRuleContext = {
	id: "task-1",
	type: "task",
	data: { label: "My Task" },
	state: { status: "waiting" },
};

describe("evaluateStatusRules", () => {
	it("returns undefined when no rules match", () => {
		const rules: StatusRule[] = [
			{
				id: "never-match",
				match: () => false,
				badge: { status: "info", message: "nope" },
			},
		];
		expect(evaluateStatusRules(rules, ctx)).toBeUndefined();
	});

	it("returns first matching badge", () => {
		const rules: StatusRule[] = [
			{
				id: "first",
				match: () => true,
				badge: { status: "warning", message: "first" },
			},
			{
				id: "second",
				match: () => true,
				badge: { status: "success", message: "second" },
			},
		];
		expect(evaluateStatusRules(rules, ctx)).toEqual({
			status: "warning",
			message: "first",
		});
	});

	it("respects entity type filter", () => {
		const rules: StatusRule[] = [
			{
				id: "wrong-type",
				entityType: "process",
				match: () => true,
				badge: { status: "error", message: "wrong" },
			},
			{
				id: "right-type",
				entityType: "task",
				match: () => true,
				badge: { status: "success", message: "right" },
			},
		];
		expect(evaluateStatusRules(rules, ctx)).toEqual({
			status: "success",
			message: "right",
		});
	});

	it("skips non-matching rules to find match", () => {
		const rules: StatusRule[] = [
			{
				id: "skip-1",
				match: (e) => e.state.status === "active",
				badge: { status: "info", message: "active" },
			},
			{
				id: "skip-2",
				entityType: "process",
				match: () => true,
				badge: { status: "error", message: "process" },
			},
			{
				id: "hit",
				match: (e) => e.state.status === "waiting",
				badge: { status: "warning", message: "waiting" },
			},
		];
		expect(evaluateStatusRules(rules, ctx)).toEqual({
			status: "warning",
			message: "waiting",
		});
	});
});

describe("timeline action factories", () => {
	it("delayedUpdate creates correct timeline action", () => {
		const action = delayedUpdate("t1", "entity-1", 500, { phase: "done" });
		expect(action).toEqual({
			key: "t1",
			delayMs: 500,
			action: "updateEntity",
			entityId: "entity-1",
			updates: { phase: "done" },
		});
	});

	it("delayedDelete creates correct timeline action", () => {
		const action = delayedDelete("t2", "entity-2", 1000);
		expect(action).toEqual({
			key: "t2",
			delayMs: 1000,
			action: "deleteEntity",
			entityId: "entity-2",
		});
	});

	it("delayedMove creates correct timeline action", () => {
		const action = delayedMove("t3", "entity-3", "space-b", 750);
		expect(action).toEqual({
			key: "t3",
			delayMs: 750,
			action: "moveEntity",
			entityId: "entity-3",
			toSpaceId: "space-b",
		});
	});
});
