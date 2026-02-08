import type { Action } from "../../application/state/actions";

type RuntimeWarningDeps = {
	engineId: string;
	message: string;
	dispatch: (action: Action) => void;
	isProduction: boolean;
	log: (message: string) => void;
};

export const emitRuntimeWarning = ({
	engineId,
	message,
	dispatch,
	isProduction,
	log,
}: RuntimeWarningDeps): void => {
	if (!isProduction) {
		log(`[runtime:${engineId}] ${message}`);
	}

	dispatch({
		type: "EMIT_EVENTS",
		payload: {
			events: [
				{
					type: "RUNTIME_WARNING",
					message,
				},
			],
		},
	});
};
