import { describe, expect, it } from "vitest";

import type {
	WorkflowDefinition,
	WorkflowTransitionContext,
} from "@/components/game/types/behavior";
import {
	checkAutoTransition,
	createWorkflow,
	transitionWorkflow,
	validateWorkflow,
} from "../behavior/workflow";

const pipelineDefinition: WorkflowDefinition = {
	initialState: "ready",
	states: [
		{ name: "ready" },
		{ name: "parsing", autoTransitionMs: 500, autoTransitionTo: "allocating" },
		{ name: "allocating" },
		{ name: "executing" },
		{ name: "opened" },
	],
	transitions: [
		{ from: "ready", to: "parsing" },
		{ from: "parsing", to: "allocating" },
		{ from: "allocating", to: "executing" },
		{ from: "executing", to: "opened" },
	],
};

describe("workflow", () => {
	describe("createWorkflow", () => {
		it("initializes with initial state and history", () => {
			const instance = createWorkflow(pipelineDefinition, 1000);
			expect(instance.currentState).toBe("ready");
			expect(instance.enteredAt).toBe(1000);
			expect(instance.history).toEqual(["ready"]);
		});
	});

	describe("transitionWorkflow", () => {
		it("transitions to valid state", () => {
			const instance = createWorkflow(pipelineDefinition, 1000);
			const next = transitionWorkflow(
				instance,
				pipelineDefinition,
				"parsing",
				undefined,
				2000,
			);
			expect(next.currentState).toBe("parsing");
			expect(next.enteredAt).toBe(2000);
			expect(next.history).toEqual(["ready", "parsing"]);
		});

		it("rejects unknown target state", () => {
			const instance = createWorkflow(pipelineDefinition, 1000);
			const next = transitionWorkflow(
				instance,
				pipelineDefinition,
				"nonexistent",
			);
			expect(next).toBe(instance);
		});

		it("rejects disallowed transition", () => {
			const instance = createWorkflow(pipelineDefinition, 1000);
			const next = transitionWorkflow(instance, pipelineDefinition, "opened");
			expect(next).toBe(instance);
		});

		it("respects guard function", () => {
			const guarded: WorkflowDefinition = {
				initialState: "idle",
				states: [{ name: "idle" }, { name: "active" }],
				transitions: [
					{
						from: "idle",
						to: "active",
						guard: (ctx) => ctx.entityData.allowed === true,
					},
				],
			};
			const instance = createWorkflow(guarded, 0);

			const blocked: WorkflowTransitionContext = {
				currentState: "idle",
				entityData: { allowed: false },
			};
			expect(transitionWorkflow(instance, guarded, "active", blocked)).toBe(
				instance,
			);

			const allowed: WorkflowTransitionContext = {
				currentState: "idle",
				entityData: { allowed: true },
			};
			const next = transitionWorkflow(instance, guarded, "active", allowed);
			expect(next.currentState).toBe("active");
		});

		it("allows all transitions when no transitions defined", () => {
			const open: WorkflowDefinition = {
				initialState: "a",
				states: [{ name: "a" }, { name: "b" }, { name: "c" }],
			};
			const instance = createWorkflow(open, 0);
			const next = transitionWorkflow(instance, open, "c", undefined, 100);
			expect(next.currentState).toBe("c");
			expect(next.history).toEqual(["a", "c"]);
		});

		it("returns new instance (immutability)", () => {
			const instance = createWorkflow(pipelineDefinition, 1000);
			const next = transitionWorkflow(
				instance,
				pipelineDefinition,
				"parsing",
				undefined,
				2000,
			);
			expect(next).not.toBe(instance);
			expect(instance.currentState).toBe("ready");
			expect(instance.history).toEqual(["ready"]);
		});
	});

	describe("checkAutoTransition", () => {
		it("returns target when time elapsed", () => {
			const instance = createWorkflow(pipelineDefinition, 1000);
			const parsing = transitionWorkflow(
				instance,
				pipelineDefinition,
				"parsing",
				undefined,
				1000,
			);
			const target = checkAutoTransition(parsing, pipelineDefinition, 1600);
			expect(target).toBe("allocating");
		});

		it("returns undefined when not enough time", () => {
			const instance = createWorkflow(pipelineDefinition, 1000);
			const parsing = transitionWorkflow(
				instance,
				pipelineDefinition,
				"parsing",
				undefined,
				1000,
			);
			const target = checkAutoTransition(parsing, pipelineDefinition, 1200);
			expect(target).toBeUndefined();
		});

		it("returns undefined for states without auto-transition", () => {
			const instance = createWorkflow(pipelineDefinition, 1000);
			const target = checkAutoTransition(instance, pipelineDefinition, 5000);
			expect(target).toBeUndefined();
		});
	});

	describe("validateWorkflow", () => {
		it("catches missing initial state", () => {
			const errors = validateWorkflow({
				initialState: "missing",
				states: [{ name: "a" }],
			});
			expect(errors).toContain('Initial state "missing" not found in states');
		});

		it("catches unknown auto-transition target", () => {
			const errors = validateWorkflow({
				initialState: "a",
				states: [{ name: "a", autoTransitionMs: 100, autoTransitionTo: "z" }],
			});
			expect(errors).toContain(
				'State "a" auto-transitions to unknown state "z"',
			);
		});

		it("catches invalid transition references", () => {
			const errors = validateWorkflow({
				initialState: "a",
				states: [{ name: "a" }],
				transitions: [
					{ from: "a", to: "z" },
					{ from: "x", to: "a" },
				],
			});
			expect(errors).toContain('Transition to unknown state "z"');
			expect(errors).toContain('Transition from unknown state "x"');
		});

		it("returns empty array for valid definition", () => {
			const errors = validateWorkflow(pipelineDefinition);
			expect(errors).toEqual([]);
		});
	});
});
