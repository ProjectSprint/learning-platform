export type ExecutionFlowIntent = {
	type: "execution_flow.phase_transition_requested";
	payload: {
		phase: string;
		source: string;
	};
};
