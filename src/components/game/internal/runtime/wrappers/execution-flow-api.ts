import type {
	ExecutionFlowApi,
	ExecutionFlowDispatcher,
	ExecutionFlowIntent,
} from "@/components/game/types/runtime";
import { runtimeError, toRuntimeErrorMessage } from "./result";

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

	dispatchIntent(intent: ExecutionFlowIntent) {
		try {
			return dispatcher.dispatchIntent(intent);
		} catch (error) {
			return runtimeError(
				`executionFlowApi.dispatchIntent: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},
});
