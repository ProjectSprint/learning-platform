import { describe, expect, it } from "vitest";
import type { Action } from "@/components/game/types/state";
import {
	applicationReducer,
	createDefaultState,
} from "../../application/state/reducers";
import { createExecutionFlowDispatcher } from "../execution-flow/dispatcher";

describe("executionFlow dispatcher", () => {
	it("processes intents in-order and transitions phase through reducer actions", () => {
		let state = createDefaultState();
		let now = 0;
		const warnings: string[] = [];

		const dispatch = (action: Action) => {
			state = applicationReducer(state, action);
		};

		const dispatcher = createExecutionFlowDispatcher({
			dispatch,
			getState: () => state,
			nowMs: () => now,
			warn: (message) => warnings.push(message),
		});

		const first = dispatcher.dispatchIntent({
			type: "execution_flow.phase_transition_requested",
			payload: { phase: "phase-a", source: "test" },
		});
		now += 10;
		const second = dispatcher.dispatchIntent({
			type: "execution_flow.phase_transition_requested",
			payload: { phase: "phase-b", source: "test" },
		});

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		expect(state.phase).toBe("phase-b");
		expect(
			warnings.some((message) => message.includes("rapid repeated intent")),
		).toBe(true);
	});

	it("treats invalid phase requests as no-op with warning and no throw", () => {
		let state = createDefaultState();
		const warnings: string[] = [];

		const dispatch = (action: Action) => {
			state = applicationReducer(state, action);
		};

		const dispatcher = createExecutionFlowDispatcher({
			dispatch,
			getState: () => state,
			nowMs: () => 0,
			warn: (message) => warnings.push(message),
		});

		const result = dispatcher.dispatchIntent({
			type: "execution_flow.phase_transition_requested",
			payload: { phase: "setup", source: "test" },
		});

		expect(result.ok).toBe(false);
		expect(state.phase).toBe("setup");
		expect(
			warnings.some((message) =>
				message.includes('phase "setup" already active'),
			),
		).toBe(true);
	});
});
