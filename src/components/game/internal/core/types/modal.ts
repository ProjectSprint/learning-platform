import type { ModalInstance } from "../../presentation/modal";

export type { ModalInstance };

export type ModalEntry = {
	instance: ModalInstance;
	visible: boolean;
};

export type OverlayState = {
	modals: Record<string, ModalEntry>;
};
