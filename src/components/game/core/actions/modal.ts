import type { ModalInstance } from "../types";

export type ModalAction =
	| { type: "OPEN_MODAL"; payload: ModalInstance }
	| { type: "CLOSE_MODAL" };
