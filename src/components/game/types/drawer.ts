export type DrawerBreakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";

export type DrawerState = "expanded" | "folded";

export type DrawerPosition = "bottom" | "top" | "left" | "right";

export type DrawerSizeMap = Partial<Record<DrawerBreakpoint, string>>;

export type DrawerConfig = {
	id: string;
	contentType: "space";
	spaceId: string;
	spaceIds?: string[];
	title?: string;
	position?: DrawerPosition;
	initialState?: DrawerState;
	foldedSize?: DrawerSizeMap;
	expandedSize?: DrawerSizeMap;
	mouseAware?: boolean;
	showFloatingButton?: boolean;
	floatingButtonLabel?: string;
};

export type DrawerInstance = DrawerConfig & {
	state: DrawerState;
};
