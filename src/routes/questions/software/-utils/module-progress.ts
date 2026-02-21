import {
	createProgressStore,
	useProgressSnapshot,
} from "../../-utils/create-progress-store";

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

export const softwareProgressStore = createProgressStore<SoftwareQuestionId>();

export const useSoftwareProgress = () =>
	useProgressSnapshot(softwareProgressStore, SOFTWARE_QUESTIONS.length);

export const getSoftwareProgressState = () => softwareProgressStore.getState();
export const setSoftwareProgressState = (next: {
	completedIds: SoftwareQuestionId[];
}) => softwareProgressStore.setState(next);
export const markSoftwareQuestionComplete = (id: SoftwareQuestionId) =>
	softwareProgressStore.markComplete(id);
export const resetSoftwareProgress = () => softwareProgressStore.reset();
