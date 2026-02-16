export type Branded<TValue, TBrand extends string> = TValue & {
	readonly __brand: TBrand;
};

export type EntityId = Branded<string, "EntityId">;
export type SpaceId = Branded<string, "SpaceId">;
export type PhaseId = Branded<string, "PhaseId">;

export const toEntityId = (value: string): EntityId => value as EntityId;
export const toSpaceId = (value: string): SpaceId => value as SpaceId;
export const toPhaseId = (value: string): PhaseId => value as PhaseId;

export const fromEntityId = (value: EntityId): string => value;
export const fromSpaceId = (value: SpaceId): string => value;
export const fromPhaseId = (value: PhaseId): string => value;
