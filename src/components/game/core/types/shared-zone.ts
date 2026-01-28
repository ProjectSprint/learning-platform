export type SharedZoneItem = {
	id: string;
	key: string;
	value: unknown;
	sourcePuzzleId?: string;
	timestamp: number;
};

export type SharedZoneState = {
	items: Record<string, SharedZoneItem>;
};
