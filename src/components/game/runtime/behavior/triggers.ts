import type { EventTrigger } from "./types";

export const whenEntityPlacedInSpace = (
	space?: string,
	entityType?: string,
): EventTrigger => ({
	event: "ENTITY_PLACED_IN_SPACE",
	...(space && { space }),
	...(entityType && { entityType }),
});

export const whenEntityTransferredToSpace = (
	space?: string,
	entityType?: string,
): EventTrigger => ({
	event: "ENTITY_TRANSFERRED_TO_SPACE",
	...(space && { space }),
	...(entityType && { entityType }),
});

export const whenEntityArrivedAtSpace = (
	space?: string,
	entityType?: string,
): EventTrigger => ({
	event: "ENTITY_ARRIVED_AT_SPACE",
	...(space && { space }),
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
