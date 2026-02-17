export type Branded<TValue, TBrand extends string> = TValue & {
	readonly __brand: TBrand;
};

export type EntityId = Branded<string, "EntityId">;
export type SpaceId = Branded<string, "SpaceId">;
export type PhaseId = Branded<string, "PhaseId">;
