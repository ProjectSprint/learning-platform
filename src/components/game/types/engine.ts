export type _EngineProgressStatus = "pending" | "started" | "finished";

export interface _EngineProgress {
	status: _EngineProgressStatus;
	startedAt?: number;
	finishedAt?: number;
	autoStarted?: boolean;
}

export interface _EngineLifecycleCallbacks<TContext = unknown> {
	onStarted?: (ctx: TContext) => void;
	onFinished?: (ctx: TContext) => void;
}

export type EngineProgressStatus = _EngineProgressStatus;
export type EngineProgress = _EngineProgress;
export type EngineLifecycleCallbacks<TContext = unknown> =
	_EngineLifecycleCallbacks<TContext>;
