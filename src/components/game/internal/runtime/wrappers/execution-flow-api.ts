import type {
	_ExecutionFlowApi,
	_ExecutionFlowDispatcher,
	_ExecutionFlowIntent,
} from "@/components/game/types/runtime";
import { runtimeError, toRuntimeErrorMessage } from "./result";

type ExecutionFlowApiDeps = {
	dispatcher: _ExecutionFlowDispatcher;
};

export const createExecutionFlowApi = ({
	dispatcher,
}: ExecutionFlowApiDeps): _ExecutionFlowApi => ({
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

	dispatchIntent(intent: _ExecutionFlowIntent) {
		try {
			return dispatcher.dispatchIntent(intent);
		} catch (error) {
			return runtimeError(
				`executionFlowApi.dispatchIntent: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},
});
