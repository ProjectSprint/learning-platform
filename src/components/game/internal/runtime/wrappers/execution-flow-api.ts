import type { ExecutionFlowDispatcher } from "../execution-flow/dispatcher";
import type { ExecutionFlowIntent } from "../intents/execution-flow";
import {
	type RuntimeApiResult,
	runtimeError,
	toRuntimeErrorMessage,
} from "./result";

export type ExecutionFlowApi = {
	requestPhaseTransition: (phase: string, source: string) => RuntimeApiResult;
	dispatchIntent: (intent: ExecutionFlowIntent) => RuntimeApiResult;
};

type ExecutionFlowApiDeps = {
	dispatcher: ExecutionFlowDispatcher;
};

export const createExecutionFlowApi = ({
	dispatcher,
}: ExecutionFlowApiDeps): ExecutionFlowApi => ({
	requestPhaseTransition(phase, source) {
		try {
			return dispatcher.dispatchIntent({
				type: "execution_flow.phase_transition_requested",
				payload: { phase, source },
			});
		} catch (error) {
			return runtimeError(
				`executionFlowApi.requestPhaseTransition: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},

	dispatchIntent(intent) {
		try {
			return dispatcher.dispatchIntent(intent);
		} catch (error) {
			return runtimeError(
				`executionFlowApi.dispatchIntent: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},
});
