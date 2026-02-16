export type _TransitionApplied<T = void> = {
	status: "applied";
	value: T;
};

export type _TransitionNoop = {
	status: "noop";
	reason: string;
};

export type _TransitionResult<T = void> =
	| _TransitionApplied<T>
	| _TransitionNoop;

export type TransitionApplied<T = void> = _TransitionApplied<T>;
export type TransitionNoop = _TransitionNoop;
export type TransitionResult<T = void> = _TransitionResult<T>;
