import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useState,
} from "react";
import type { DrawerConfig, DrawerInstance } from "../../core/types";

type DrawerEventType =
	| "DRAWER_OPEN"
	| "DRAWER_CLOSE"
	| "DRAWER_TOGGLE"
	| "DRAWER_OPENED"
	| "DRAWER_CLOSED"
	| "DRAWER_EXPANDED"
	| "DRAWER_FOLDED";

export type DrawerEvent = {
	type: DrawerEventType;
	drawerId: string;
	eventId: number;
	timestamp?: number;
};

type DrawerStoreState = {
	drawers: Record<string, DrawerInstance>;
	events: DrawerEvent[];
	lastEventId: number;
};

type DrawerStoreAction =
	| { type: "REGISTER"; payload: DrawerConfig }
	| { type: "OPEN"; payload: { drawerId: string } }
	| { type: "CLOSE"; payload: { drawerId: string } }
	| { type: "TOGGLE"; payload: { drawerId: string } }
	| {
			type: "UPDATE_CONFIG";
			payload: { drawerId: string; config: Partial<DrawerInstance> };
	  };

const initialState: DrawerStoreState = {
	drawers: {},
	events: [],
	lastEventId: 0,
};

const createDrawerInstance = (config: DrawerConfig): DrawerInstance => {
	const resolvedState = config.initialState ?? "expanded";
	return {
		...config,
		state: resolvedState,
		initialState: config.initialState ?? resolvedState,
		position: config.position ?? "bottom",
		mouseAware: config.mouseAware ?? true,
		showFloatingButton: config.showFloatingButton ?? false,
	};
};

const appendDrawerEvents = (
	state: DrawerStoreState,
	inputs: Array<Omit<DrawerEvent, "eventId" | "timestamp">>,
): DrawerStoreState => {
	if (inputs.length === 0) return state;
	let nextEventId = state.lastEventId;
	const timestamp = Date.now();
	const nextEvents = inputs.map((input) => {
		nextEventId += 1;
		return {
			...input,
			eventId: nextEventId,
			timestamp,
		};
	});
	return {
		...state,
		events: [...state.events, ...nextEvents],
		lastEventId: nextEventId,
	};
};

const reducer = (
	state: DrawerStoreState,
	action: DrawerStoreAction,
): DrawerStoreState => {
	switch (action.type) {
		case "REGISTER": {
			const existing = state.drawers[action.payload.id];
			if (existing) return state;
			const instance = createDrawerInstance(action.payload);
			return {
				...state,
				drawers: {
					...state.drawers,
					[action.payload.id]: instance,
				},
			};
		}
		case "OPEN": {
			const existing = state.drawers[action.payload.drawerId];
			if (!existing) return state;
			const shouldChange = existing.state !== "expanded";
			const nextState: DrawerStoreState = {
				...state,
				drawers: {
					...state.drawers,
					[action.payload.drawerId]: {
						...existing,
						state: "expanded",
					},
				},
			};
			const events: Array<Omit<DrawerEvent, "eventId" | "timestamp">> = [
				{ type: "DRAWER_OPEN", drawerId: action.payload.drawerId },
			];
			if (shouldChange) {
				events.push(
					{ type: "DRAWER_OPENED", drawerId: action.payload.drawerId },
					{ type: "DRAWER_EXPANDED", drawerId: action.payload.drawerId },
				);
			}
			return appendDrawerEvents(nextState, events);
		}
		case "CLOSE": {
			const existing = state.drawers[action.payload.drawerId];
			if (!existing) return state;
			const shouldChange = existing.state !== "folded";
			const nextState: DrawerStoreState = {
				...state,
				drawers: {
					...state.drawers,
					[action.payload.drawerId]: {
						...existing,
						state: "folded",
					},
				},
			};
			const events: Array<Omit<DrawerEvent, "eventId" | "timestamp">> = [
				{ type: "DRAWER_CLOSE", drawerId: action.payload.drawerId },
			];
			if (shouldChange) {
				events.push(
					{ type: "DRAWER_CLOSED", drawerId: action.payload.drawerId },
					{ type: "DRAWER_FOLDED", drawerId: action.payload.drawerId },
				);
			}
			return appendDrawerEvents(nextState, events);
		}
		case "TOGGLE": {
			const existing = state.drawers[action.payload.drawerId];
			if (!existing) return state;
			const nextDrawerState =
				existing.state === "expanded" ? "folded" : "expanded";
			const nextState: DrawerStoreState = {
				...state,
				drawers: {
					...state.drawers,
					[action.payload.drawerId]: {
						...existing,
						state: nextDrawerState,
					},
				},
			};
			const events: Array<Omit<DrawerEvent, "eventId" | "timestamp">> = [
				{ type: "DRAWER_TOGGLE", drawerId: action.payload.drawerId },
			];
			if (nextDrawerState === "expanded") {
				events.push(
					{ type: "DRAWER_OPENED", drawerId: action.payload.drawerId },
					{ type: "DRAWER_EXPANDED", drawerId: action.payload.drawerId },
				);
			} else {
				events.push(
					{ type: "DRAWER_CLOSED", drawerId: action.payload.drawerId },
					{ type: "DRAWER_FOLDED", drawerId: action.payload.drawerId },
				);
			}
			return appendDrawerEvents(nextState, events);
		}
		case "UPDATE_CONFIG": {
			const existing = state.drawers[action.payload.drawerId];
			if (!existing) return state;
			return {
				...state,
				drawers: {
					...state.drawers,
					[action.payload.drawerId]: {
						...existing,
						...action.payload.config,
					},
				},
			};
		}
		default:
			return state;
	}
};

type DrawerContextValue = {
	drawers: Record<string, DrawerInstance>;
	events: DrawerEvent[];
	registerDrawer: (config: DrawerConfig) => void;
	openDrawer: (drawerId: string) => void;
	closeDrawer: (drawerId: string) => void;
	toggleDrawer: (drawerId: string) => void;
	updateDrawerConfig: (
		drawerId: string,
		config: Partial<DrawerInstance>,
	) => void;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

export const DrawerProvider = ({ children }: { children: ReactNode }) => {
	const [state, dispatch] = useReducer(reducer, initialState);

	const registerDrawer = useCallback((config: DrawerConfig) => {
		dispatch({ type: "REGISTER", payload: config });
	}, []);

	const openDrawer = useCallback((drawerId: string) => {
		dispatch({ type: "OPEN", payload: { drawerId } });
	}, []);

	const closeDrawer = useCallback((drawerId: string) => {
		dispatch({ type: "CLOSE", payload: { drawerId } });
	}, []);

	const toggleDrawer = useCallback((drawerId: string) => {
		dispatch({ type: "TOGGLE", payload: { drawerId } });
	}, []);

	const updateDrawerConfig = useCallback(
		(drawerId: string, config: Partial<DrawerInstance>) => {
			dispatch({ type: "UPDATE_CONFIG", payload: { drawerId, config } });
		},
		[],
	);

	const value = useMemo(
		() => ({
			drawers: state.drawers,
			events: state.events,
			registerDrawer,
			openDrawer,
			closeDrawer,
			toggleDrawer,
			updateDrawerConfig,
		}),
		[
			closeDrawer,
			openDrawer,
			registerDrawer,
			state.drawers,
			state.events,
			toggleDrawer,
			updateDrawerConfig,
		],
	);

	return (
		<DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>
	);
};

export const useDrawerStore = () => {
	const ctx = useContext(DrawerContext);
	if (!ctx) {
		throw new Error("useDrawerStore must be used within DrawerProvider");
	}
	return ctx;
};

export type DrawerEventBatch = {
	events: DrawerEvent[];
	cursor: number;
	ack: () => void;
};

export const useDrawerEvents = (drawerId?: string): DrawerEventBatch => {
	const { events } = useDrawerStore();
	const [cursor, setCursor] = useState(0);

	const filtered = useMemo(() => {
		const next = events.filter((event) => event.eventId > cursor);
		if (!drawerId) return next;
		return next.filter((event) => event.drawerId === drawerId);
	}, [cursor, drawerId, events]);

	const ack = useCallback(() => {
		if (filtered.length === 0) return;
		setCursor(filtered[filtered.length - 1].eventId);
	}, [filtered]);

	useEffect(() => {
		const lastEventId = events.length ? events[events.length - 1].eventId : 0;
		if (lastEventId < cursor) {
			setCursor(0);
		}
	}, [cursor, events]);

	useEffect(() => {
		if (drawerId === undefined) {
			setCursor(0);
			return;
		}
		setCursor(0);
	}, [drawerId]);

	return {
		events: filtered,
		cursor,
		ack,
	};
};
