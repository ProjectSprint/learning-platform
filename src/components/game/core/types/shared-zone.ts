export type SharedZoneItem = {
	id: string;
	key: string;
	value: unknown;
	sourceCanvasId?: string;
	timestamp: number;
};

export type SharedZoneState = {
	items: Record<string, SharedZoneItem>;
};
