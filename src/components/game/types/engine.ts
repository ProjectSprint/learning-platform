export type EngineProgressStatus = "pending" | "started" | "finished";

export interface EngineProgress {
	status: EngineProgressStatus;
	startedAt?: number;
	finishedAt?: number;
	autoStarted?: boolean;
}

export interface EngineLifecycleCallbacks<TContext = unknown> {
	onStarted?: (ctx: TContext | undefined) => void;
	onFinished?: (ctx: TContext | undefined) => void;
}
