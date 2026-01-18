import { useCallback, useState } from "react";
import type {
	EngineLifecycleCallbacks,
	EngineProgress,
	EngineProgressStatus,
} from "./engine-types";

interface UseEngineProgressOptions<TContext>
	extends EngineLifecycleCallbacks<TContext> {
	context?: TContext;
	initialStatus?: EngineProgressStatus;
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
	const { onStarted, onFinished, context, initialStatus = "pending" } = options;

	const [progress, setProgress] = useState<EngineProgress>({
		status: initialStatus,
	});

	const start = useCallback(() => {
		setProgress((prev) => {
			if (prev.status !== "pending") return prev;
			const next: EngineProgress = { status: "started", startedAt: Date.now() };
			onStarted?.(context as TContext);
			return next;
		});
	}, [context, onStarted]);

	const finish = useCallback(() => {
		setProgress((prev) => {
			if (prev.status === "finished") return prev;
			const next: EngineProgress = {
				...prev,
				status: "finished",
				finishedAt: Date.now(),
			};
			onFinished?.(context as TContext);
			return next;
		});
	}, [context, onFinished]);

	const reset = useCallback(() => {
		setProgress({ status: "pending" });
	}, []);

	return { progress, start, finish, reset, context };
};
