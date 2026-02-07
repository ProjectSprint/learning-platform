import type { ModalInstance } from "../../presentation/modal";
import type { DrawerInstance } from "./drawer";

export type { ModalInstance };

export type ModalEntry = {
	instance: ModalInstance;
	visible: boolean;
};

export type OverlayState = {
	modals: Record<string, ModalEntry>;
	/** Drawer instances keyed by drawer id. */
	drawers?: Record<string, DrawerInstance>;
};
