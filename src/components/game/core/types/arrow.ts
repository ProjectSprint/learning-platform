export type ArrowAnchor = "tl" | "tr" | "bl" | "br";

export type ArrowEndpoint = {
	puzzleId: string;
	anchor: ArrowAnchor;
};

export type ArrowStyle = {
	stroke?: string;
	strokeWidth?: number;
	opacity?: number;
	headSize?: number;
	dashed?: boolean;
	bow?: number;
	stretch?: number;
	stretchMin?: number;
	stretchMax?: number;
	padStart?: number;
	padEnd?: number;
	flip?: boolean;
	straights?: boolean;
};

export type Arrow = {
	id: string;
	from: ArrowEndpoint;
	to: ArrowEndpoint;
	style?: ArrowStyle;
	label?: string;
};
