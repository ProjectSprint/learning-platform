import type {
	EntityEventTrigger,
	ModalEventTrigger,
	PhaseEventTrigger,
	TerminalEventTrigger,
} from "@/components/game/types/behavior";

export const whenEntityPlacedInSpace = <
	TSpaceId extends string = never,
	TEntityType extends string = never,
>(
	space?: TSpaceId,
	entityType?: TEntityType,
): EntityEventTrigger<TSpaceId, TEntityType> => ({
	event: "ENTITY_PLACED_IN_SPACE",
	...(space && { space }),
	...(entityType && { entityType }),
});

export const whenEntityTransferredToSpace = <
	TSpaceId extends string = never,
	TEntityType extends string = never,
>(
	space?: TSpaceId,
	entityType?: TEntityType,
): EntityEventTrigger<TSpaceId, TEntityType> => ({
	event: "ENTITY_TRANSFERRED_TO_SPACE",
	...(space && { space }),
	...(entityType && { entityType }),
});

export const whenEntityArrivedAtSpace = <
	TSpaceId extends string = never,
	TEntityType extends string = never,
>(
	space?: TSpaceId,
	entityType?: TEntityType,
): EntityEventTrigger<TSpaceId, TEntityType> => ({
	event: "ENTITY_ARRIVED_AT_SPACE",
	...(space && { space }),
	...(entityType && { entityType }),
});

export const entityClicked = <
	TEntityType extends string = never,
	TSpaceId extends string = never,
>(
	entityType?: TEntityType,
	space?: TSpaceId,
): EntityEventTrigger<TSpaceId, TEntityType> => ({
	event: "ENTITY_CLICKED",
	...(entityType && { entityType }),
	...(space && { space }),
});

export const modalClosed = <TModalId extends string = never>(
	modalId?: TModalId,
): ModalEventTrigger<TModalId, never> => ({
	event: "MODAL_CLOSED",
	...(modalId && { modalId }),
});

export const modalSubmitted = <
	TModalId extends string = never,
	TModalActionId extends string = never,
>(
	modalId?: TModalId,
	modalActionId?: TModalActionId,
): ModalEventTrigger<TModalId, TModalActionId> => ({
	event: "MODAL_SUBMITTED",
	...(modalId && { modalId }),
	...(modalActionId && { modalActionId }),
});

export const terminalInput = (
	match?: string | RegExp,
): TerminalEventTrigger => ({
	event: "TERMINAL_INPUT",
	...(match && { match }),
});

export const phaseChanged = <TPhase extends string = never>(
	to?: TPhase,
	from?: TPhase,
): PhaseEventTrigger<TPhase> => ({
	event: "PHASE_CHANGED",
	...(to && { to }),
	...(from && { from }),
});
