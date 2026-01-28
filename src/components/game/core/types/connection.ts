export type Connection = {
	id: string;
	type: "cable" | "wireless";
	from: { x: number; y: number };
	to: { x: number; y: number };
	cableId?: string;
};

export type CrossCanvasConnection = {
	id: string;
	type: "cable" | "wireless";
	from: {
		canvasId: string;
		x: number;
		y: number;
	};
	to: {
		canvasId: string;
		x: number;
		y: number;
	};
	cableId?: string;
};
