export type EngineProgressStatus = "pending" | "started" | "finished";

export interface EngineProgress {
	status: EngineProgressStatus;
	startedAt?: number;
	finishedAt?: number;
}

export interface EngineLifecycleCallbacks<TContext = unknown> {
	onStarted?: (ctx: TContext) => void;
	onFinished?: (ctx: TContext) => void;
}
