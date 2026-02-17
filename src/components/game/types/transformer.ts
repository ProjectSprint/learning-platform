export type TransitionApplied<T = void> = {
	status: "applied";
	value: T;
};

export type TransitionNoop = {
	status: "noop";
	reason: string;
};

export type TransitionResult<T = void> = TransitionApplied<T> | TransitionNoop;
