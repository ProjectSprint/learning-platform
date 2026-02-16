import type { EntityId, PhaseId, SpaceId } from "@/components/game/types/ids";

export const toEntityId = (value: string): EntityId => value as EntityId;
export const toSpaceId = (value: string): SpaceId => value as SpaceId;
export const toPhaseId = (value: string): PhaseId => value as PhaseId;

export const fromEntityId = (value: EntityId): string => value;
export const fromSpaceId = (value: SpaceId): string => value;
export const fromPhaseId = (value: PhaseId): string => value;
