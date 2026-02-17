import type { ModalInstance } from "@/components/game/types/modal";
import type {
	Commands,
	ExecutionFlowApi,
	InteractionSessionApi,
	InteractionSessionState,
} from "@/components/game/types/runtime";
import {
	runtimeError,
	runtimeOk,
	toRuntimeErrorMessage,
	wrapRuntimeErrorMessage,
} from "./result";

type InteractionSessionApiDeps = {
	commands: Commands;
	executionFlowApi: ExecutionFlowApi;
	setInteractionState: (
		next:
			| InteractionSessionState
			| ((prev: InteractionSessionState) => InteractionSessionState),
	) => void;
};

export const createInteractionSessionApi = ({
	commands,
	executionFlowApi,
	setInteractionState,
}: InteractionSessionApiDeps): InteractionSessionApi => ({
	openModal(modal: ModalInstance) {
		try {
			commands.openModal(modal);
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`interactionSessionApi.openModal: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},

	closeModal(modalId) {
		try {
			commands.closeModal(modalId);
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`interactionSessionApi.closeModal: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},

	requestPhaseTransition(phase, source) {
		try {
			const result = executionFlowApi.requestPhaseTransition(phase, source);
			if (!result.ok) {
				return runtimeError(
					wrapRuntimeErrorMessage(
						"interactionSessionApi.requestPhaseTransition",
						result.error.message,
					),
				);
			}
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`interactionSessionApi.requestPhaseTransition: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},

	setTerminalVisible(visible) {
		try {
			setInteractionState((prev) => ({
				...prev,
				terminalVisible: visible,
			}));
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`interactionSessionApi.setTerminalVisible: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},

	setModalGateOpen(open) {
		try {
			setInteractionState((prev) => ({
				...prev,
				modalGateOpen: open,
			}));
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`interactionSessionApi.setModalGateOpen: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},
});
