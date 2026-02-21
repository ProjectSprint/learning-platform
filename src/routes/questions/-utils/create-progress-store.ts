import { useSyncExternalStore } from "react";

type ProgressState<TId extends string> = {
	completedIds: TId[];
};

export type ProgressStore<TId extends string> = {
	getState: () => ProgressState<TId>;
	setState: (next: ProgressState<TId>) => void;
	markComplete: (id: TId) => void;
	reset: () => void;
	subscribe: (listener: () => void) => () => void;
};

export const createProgressStore = <
	TId extends string,
>(): ProgressStore<TId> => {
	let state: ProgressState<TId> = { completedIds: [] };
	const listeners = new Set<() => void>();

	const emitChange = () => {
		for (const listener of listeners) {
			listener();
		}
	};

	return {
		getState: () => state,
		setState: (next) => {
			state = { completedIds: Array.from(new Set(next.completedIds)) };
			emitChange();
		},
		markComplete: (id) => {
			if (state.completedIds.includes(id)) return;
			state = {
				completedIds: Array.from(new Set([...state.completedIds, id])),
			};
			emitChange();
		},
		reset: () => {
			state = { completedIds: [] };
			emitChange();
		},
		subscribe: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
};

export const useProgressSnapshot = <TId extends string>(
	store: ProgressStore<TId>,
	totalQuestions: number,
) => {
	const snapshot = useSyncExternalStore(
		store.subscribe,
		store.getState,
		store.getState,
	);

	return {
		completedIds: snapshot.completedIds,
		completedCount: snapshot.completedIds.length,
		totalQuestions,
	};
};
