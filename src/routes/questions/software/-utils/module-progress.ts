import { useSyncExternalStore } from "react";

export type SoftwareQuestionId = "cores-and-threads";

export type SoftwareQuestion = {
	id: SoftwareQuestionId;
	path: string;
	title: string;
};

export const SOFTWARE_QUESTIONS: SoftwareQuestion[] = [
	{
		id: "cores-and-threads",
		path: "/questions/software/cores-and-threads",
		title: "Cores and Threads",
	},
];

const normalizePath = (path: string) =>
	path.length > 1 ? path.replace(/\/$/, "") : path;

export const getQuestionIndexByPath = (pathname: string) => {
	const normalized = normalizePath(pathname);
	return SOFTWARE_QUESTIONS.findIndex(
		(question) => normalizePath(question.path) === normalized,
	);
};

export const getNextQuestionPath = (id: SoftwareQuestionId) => {
	const index = SOFTWARE_QUESTIONS.findIndex((question) => question.id === id);
	if (index < 0) return null;
	const nextQuestion = SOFTWARE_QUESTIONS[index + 1];
	return nextQuestion?.path ?? null;
};

export const getFirstQuestionPath = () =>
	SOFTWARE_QUESTIONS[0]?.path ?? "/questions/software";

type ModuleProgressState = {
	completedIds: SoftwareQuestionId[];
};

const createDefaultState = (): ModuleProgressState => ({
	completedIds: [],
});

let progressState = createDefaultState();
const listeners = new Set<() => void>();

const emitChange = () => {
	for (const listener of listeners) {
		listener();
	}
};

const getState = () => progressState;

const setState = (next: ModuleProgressState) => {
	progressState = {
		completedIds: Array.from(new Set(next.completedIds)),
	};
	emitChange();
};

const markComplete = (id: SoftwareQuestionId) => {
	if (progressState.completedIds.includes(id)) return;
	setState({ completedIds: [...progressState.completedIds, id] });
};

const reset = () => {
	setState(createDefaultState());
};

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

export const softwareProgressStore = {
	getState,
	setState,
	markComplete,
	reset,
	subscribe,
};

export const useSoftwareProgress = () => {
	const snapshot = useSyncExternalStore(
		softwareProgressStore.subscribe,
		softwareProgressStore.getState,
		softwareProgressStore.getState,
	);

	return {
		completedIds: snapshot.completedIds,
		completedCount: snapshot.completedIds.length,
		totalQuestions: SOFTWARE_QUESTIONS.length,
	};
};

export const getSoftwareProgressState = () => softwareProgressStore.getState();
export const setSoftwareProgressState = (next: ModuleProgressState) =>
	softwareProgressStore.setState(next);
export const markSoftwareQuestionComplete = (id: SoftwareQuestionId) =>
	softwareProgressStore.markComplete(id);
export const resetSoftwareProgress = () => softwareProgressStore.reset();
