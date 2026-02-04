import { useCallback, useEffect, useRef, useState } from "react";
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
	const prevStatusRef = useRef<EngineProgressStatus>(progress.status);

	const start = useCallback(() => {
		setProgress((prev) => {
			if (prev.status !== "pending") return prev;
			return { status: "started", startedAt: Date.now() };
		});
	}, []);

	const finish = useCallback(() => {
		setProgress((prev) => {
			if (prev.status === "finished") return prev;
			return {
				...prev,
				status: "finished",
				finishedAt: Date.now(),
			};
		});
	}, []);

	const reset = useCallback(() => {
		setProgress({ status: "pending" });
	}, []);

	useEffect(() => {
		const prevStatus = prevStatusRef.current;
		if (prevStatus === progress.status) {
			return;
		}
		prevStatusRef.current = progress.status;

		if (progress.status === "started") {
			onStarted?.(context as TContext);
		}
		if (progress.status === "finished") {
			onFinished?.(context as TContext);
		}
	}, [context, onFinished, onStarted, progress.status]);

	return { progress, start, finish, reset, context };
};
