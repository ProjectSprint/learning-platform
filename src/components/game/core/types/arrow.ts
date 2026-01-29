export type ArrowAnchor = {
	x: number;
	y: number;
	offsetX?: number;
	offsetY?: number;
};

export type ArrowEndpoint = {
	puzzleId: string;
	anchor?: ArrowAnchor;
};

export type ArrowStyle = {
	stroke?: string;
	strokeWidth?: number;
	opacity?: number;
	headSize?: number;
	bow?: number;
	dashed?: boolean;
};

export type Arrow = {
	id: string;
	from: ArrowEndpoint;
	to: ArrowEndpoint;
	style?: ArrowStyle;
	label?: string;
};
