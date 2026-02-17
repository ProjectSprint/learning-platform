import { useCallback, useEffect, useReducer } from "react";
import { useGameDispatch } from "@/components/game/internal/game-provider";
import type {
	EngineLifecycleCallbacks,
	EngineProgress,
	EngineProgressStatus,
} from "@/components/game/types/engine";
import type { GameEventInput } from "@/components/game/types/state";

type EngineLifecycleEventType = "ENGINE_STARTED" | "ENGINE_FINISHED";

type EngineProgressState = {
	progress: EngineProgress;
	pendingEvents: EngineLifecycleEventType[];
};

type EngineProgressAction =
	| { type: "START" }
	| { type: "FINISH" }
	| { type: "RESET" }
	| { type: "ACK_EVENTS" };

const createInitialState = (
	initialStatus: EngineProgressStatus,
): EngineProgressState => ({
	progress: { status: initialStatus },
	pendingEvents: [],
});

const progressReducer = (
	state: EngineProgressState,
	action: EngineProgressAction,
): EngineProgressState => {
	switch (action.type) {
		case "START":
			if (state.progress.status !== "pending") {
				return state;
			}
			return {
				progress: {
					...state.progress,
					status: "started",
					startedAt: Date.now(),
				},
				pendingEvents: [...state.pendingEvents, "ENGINE_STARTED"],
			};
		case "FINISH":
			if (state.progress.status === "finished") {
				return state;
			}
			return {
				progress: {
					...state.progress,
					status: "finished",
					finishedAt: Date.now(),
				},
				pendingEvents: [...state.pendingEvents, "ENGINE_FINISHED"],
			};
		case "RESET":
			return {
				progress: { status: "pending" },
				pendingEvents: [],
			};
		case "ACK_EVENTS":
			if (state.pendingEvents.length === 0) {
				return state;
			}
			return { ...state, pendingEvents: [] };
		default:
			return state;
	}
};

interface UseEngineProgressOptions<TContext>
	extends EngineLifecycleCallbacks<TContext> {
	context?: TContext;
	initialStatus?: EngineProgressStatus;
	engineId?: string;
}

export interface EngineController<TContext = unknown> {
	progress: EngineProgress;
	start: () => void;
	finish: () => void;
	reset: () => void;
	context?: TContext;
}

export const useEngineProgress = <TContext = unknown>(
	options: UseEngineProgressOptions<TContext> = {},
): EngineController<TContext> => {
	const {
		onStarted,
		onFinished,
		context,
		initialStatus = "pending",
		engineId,
	} = options;
	const dispatch = useGameDispatch();

	const [state, dispatchProgress] = useReducer(
		progressReducer,
		initialStatus,
		createInitialState,
	);

	const start = useCallback(() => {
		dispatchProgress({ type: "START" });
	}, []);

	const finish = useCallback(() => {
		dispatchProgress({ type: "FINISH" });
	}, []);

	const reset = useCallback(() => {
		dispatchProgress({ type: "RESET" });
	}, []);

	useEffect(() => {
		if (state.pendingEvents.length === 0) {
			return;
		}

		const lifecycleEvents: GameEventInput[] = state.pendingEvents.map(
			(eventType) =>
				eventType === "ENGINE_STARTED"
					? { type: "ENGINE_STARTED", engineId }
					: { type: "ENGINE_FINISHED", engineId },
		);

		if (lifecycleEvents.length > 0) {
			dispatch({ type: "EMIT_EVENTS", payload: { events: lifecycleEvents } });
		}

		for (const eventType of state.pendingEvents) {
			if (eventType === "ENGINE_STARTED") {
				onStarted?.(context as TContext);
			}
			if (eventType === "ENGINE_FINISHED") {
				onFinished?.(context as TContext);
			}
		}

		dispatchProgress({ type: "ACK_EVENTS" });
	}, [context, dispatch, engineId, onFinished, onStarted, state.pendingEvents]);

	return { progress: state.progress, start, finish, reset, context };
};
