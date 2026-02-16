import type {
	_ExecutionFlowDispatcher,
	_ExecutionFlowDispatcherDeps,
	_ExecutionFlowIntent,
	_RuntimeApiResult,
} from "@/components/game/types/runtime";
import { runtimeError, runtimeOk } from "../wrappers/result";

const RAPID_INTENT_THRESHOLD_MS = 100;

export const createExecutionFlowDispatcher = (
	deps: _ExecutionFlowDispatcherDeps,
): _ExecutionFlowDispatcher => {
	const { dispatch, getState, nowMs, warn } = deps;
	const lastIntentAtByType = new Map<_ExecutionFlowIntent["type"], number>();

	const dispatchIntent = (intent: _ExecutionFlowIntent): _RuntimeApiResult => {
		const now = nowMs();
		const lastSeen = lastIntentAtByType.get(intent.type);
		if (
			typeof lastSeen === "number" &&
			now - lastSeen <= RAPID_INTENT_THRESHOLD_MS
		) {
			warn(
				`executionFlow: rapid repeated intent "${intent.type}" within ${RAPID_INTENT_THRESHOLD_MS}ms`,
			);
		}
		lastIntentAtByType.set(intent.type, now);

		if (intent.type !== "execution_flow.phase_transition_requested") {
			warn(`executionFlow: unsupported intent "${intent.type}"`);
			return runtimeError(`executionFlow: unsupported intent "${intent.type}"`);
		}

		const targetPhase = intent.payload.phase.trim();
		if (!targetPhase) {
			warn("executionFlow: empty phase transition request ignored");
			return runtimeError(
				"executionFlow: empty phase transition request ignored",
			);
		}

		const currentPhase = getState().phase;
		if (currentPhase === targetPhase) {
			warn(`executionFlow: phase "${targetPhase}" already active`);
			return runtimeError(
				`executionFlow: phase "${targetPhase}" already active`,
			);
		}

		dispatch({
			type: "SET_PHASE",
			payload: { phase: targetPhase },
		});

		return runtimeOk();
	};

	return { dispatchIntent };
};

export const executionFlowRapidIntentThresholdMs = RAPID_INTENT_THRESHOLD_MS;
