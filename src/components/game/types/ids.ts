export type _Branded<TValue, TBrand extends string> = TValue & {
	readonly __brand: TBrand;
};

export type _EntityId = _Branded<string, "EntityId">;
export type _SpaceId = _Branded<string, "SpaceId">;
export type _PhaseId = _Branded<string, "PhaseId">;

export type Branded<TValue, TBrand extends string> = _Branded<TValue, TBrand>;
export type EntityId = _EntityId;
export type SpaceId = _SpaceId;
export type PhaseId = _PhaseId;
