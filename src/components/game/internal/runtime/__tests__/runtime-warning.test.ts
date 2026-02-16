import { describe, expect, it, vi } from "vitest";
import { emitRuntimeWarning } from "../execution-flow/warning";

describe("emitRuntimeWarning", () => {
	it("logs in non-production and emits message-only warning event", () => {
		const dispatch = vi.fn();
		const log = vi.fn();

		emitRuntimeWarning({
			engineId: "engine-a",
			message: "phase request ignored",
			dispatch,
			isProduction: false,
			log,
		});

		expect(log).toHaveBeenCalledWith(
			"[runtime:engine-a] phase request ignored",
		);
		expect(dispatch).toHaveBeenCalledWith({
			type: "EMIT_EVENTS",
			payload: {
				events: [
					{
						type: "RUNTIME_WARNING",
						message: "phase request ignored",
					},
				],
			},
		});
	});
});
