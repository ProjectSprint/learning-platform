import type {
	TransitionApplied,
	TransitionNoop,
} from "@/components/game/types/transformer";

export const transitionApplied = <T>(value: T): TransitionApplied<T> => ({
	status: "applied",
	value,
});

export const transitionNoop = (reason: string): TransitionNoop => ({
	status: "noop",
	reason,
});
