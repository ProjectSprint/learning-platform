export type TransitionApplied<T = void> = {
	status: "applied";
	value: T;
};

export type TransitionNoop = {
	status: "noop";
	reason: string;
};

export type TransitionResult<T = void> = TransitionApplied<T> | TransitionNoop;

export const transitionApplied = <T>(value: T): TransitionApplied<T> => ({
	status: "applied",
	value,
});

export const transitionNoop = (reason: string): TransitionNoop => ({
	status: "noop",
	reason,
});
