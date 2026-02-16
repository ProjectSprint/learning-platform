import type { ModalInstance } from "../../presentation/modal";

export type InteractionSessionIntent =
	| {
			type: "interaction_session.open_modal";
			payload: { modal: ModalInstance };
	  }
	| {
			type: "interaction_session.close_modal";
			payload: { modalId?: string };
	  }
	| {
			type: "interaction_session.set_terminal_visible";
			payload: { visible: boolean };
	  }
	| {
			type: "interaction_session.set_modal_gate_open";
			payload: { open: boolean };
	  }
	| {
			type: "interaction_session.request_phase_transition";
			payload: { phase: string; source: string };
	  };
