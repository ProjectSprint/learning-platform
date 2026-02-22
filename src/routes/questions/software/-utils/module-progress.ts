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

// --- Progress store ---

let completedIds: SoftwareQuestionId[] = [];
const listeners = new Set<() => void>();

const emitChange = () => {
	for (const listener of listeners) {
		listener();
	}
};

const getSnapshot = () => completedIds;

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

export const markSoftwareQuestionComplete = (id: SoftwareQuestionId) => {
	if (completedIds.includes(id)) return;
	completedIds = [...new Set([...completedIds, id])];
	emitChange();
};

export const useSoftwareProgress = () => {
	const ids = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
	return {
		completedIds: ids,
		completedCount: ids.length,
		totalQuestions: SOFTWARE_QUESTIONS.length,
	};
};
