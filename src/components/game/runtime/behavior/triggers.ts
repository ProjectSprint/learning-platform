import type { EventTrigger } from "./types";

export const entityEnteredSpace = (
	space?: string,
	entityType?: string,
): EventTrigger => ({
	event: "ENTITY_ENTERED_SPACE",
	...(space && { space }),
	...(entityType && { entityType }),
});

export const entityMoved = (
	toSpace?: string,
	entityType?: string,
): EventTrigger => ({
	event: "ENTITY_MOVED",
	...(toSpace && { toSpace }),
	...(entityType && { entityType }),
});

export const entityClicked = (
	entityType?: string,
	space?: string,
): EventTrigger => ({
	event: "ENTITY_CLICKED",
	...(entityType && { entityType }),
	...(space && { space }),
});

export const modalClosed = (modalId?: string): EventTrigger => ({
	event: "MODAL_CLOSED",
	...(modalId && { modalId }),
});

export const modalSubmitted = (
	modalId?: string,
	modalActionId?: string,
): EventTrigger => ({
	event: "MODAL_SUBMITTED",
	...(modalId && { modalId }),
	...(modalActionId && { modalActionId }),
});

export const terminalInput = (match?: string | RegExp): EventTrigger => ({
	event: "TERMINAL_INPUT",
	...(match && { match }),
});

export const phaseChanged = (to?: string, from?: string): EventTrigger => ({
	event: "PHASE_CHANGED",
	...(to && { to }),
	...(from && { from }),
});
