import type { ModalInstance } from "../../presentation/modal";

export type { ModalInstance };

export type OverlayState = {
	activeModal: ModalInstance | null;
	modalDrafts: Record<string, Record<string, unknown>>;
};
