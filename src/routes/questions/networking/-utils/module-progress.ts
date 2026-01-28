import { useSyncExternalStore } from "react";

export type NetworkingQuestionId =
	| "tcp"
	| "udp"
	| "webserver-ssl"
	| "dhcp"
	| "internet";

export type NetworkingQuestion = {
	id: NetworkingQuestionId;
	path: string;
	title: string;
};

export const NETWORKING_QUESTIONS: NetworkingQuestion[] = [
	{
		id: "dhcp",
		path: "/questions/networking/dhcp",
		title: "DHCP Basics",
	},
	{
		id: "internet",
		path: "/questions/networking/internet",
		title: "Internet Gateway",
	},
	{
		id: "webserver-ssl",
		path: "/questions/networking/webserver-ssl",
		title: "Webserver SSL",
	},
	{
		id: "tcp",
		path: "/questions/networking/tcp",
		title: "TCP Reliability",
	},
	{
		id: "udp",
		path: "/questions/networking/udp",
		title: "UDP Streaming",
	},
];

const normalizePath = (path: string) =>
	path.length > 1 ? path.replace(/\/$/, "") : path;

export const getQuestionIndexByPath = (pathname: string) => {
	const normalized = normalizePath(pathname);
	return NETWORKING_QUESTIONS.findIndex(
		(question) => normalizePath(question.path) === normalized,
	);
};

export const getNextQuestionPath = (id: NetworkingQuestionId) => {
	const index = NETWORKING_QUESTIONS.findIndex(
		(question) => question.id === id,
	);
	if (index < 0) return null;
	const nextQuestion = NETWORKING_QUESTIONS[index + 1];
	return nextQuestion?.path ?? null;
};

export const getFirstQuestionPath = () =>
	NETWORKING_QUESTIONS[0]?.path ?? "/questions/networking";

type ModuleProgressState = {
	completedIds: NetworkingQuestionId[];
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

const markComplete = (id: NetworkingQuestionId) => {
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

export const networkingProgressStore = {
	getState,
	setState,
	markComplete,
	reset,
	subscribe,
};

export const useNetworkingProgress = () => {
	const snapshot = useSyncExternalStore(
		networkingProgressStore.subscribe,
		networkingProgressStore.getState,
		networkingProgressStore.getState,
	);

	return {
		completedIds: snapshot.completedIds,
		completedCount: snapshot.completedIds.length,
		totalQuestions: NETWORKING_QUESTIONS.length,
	};
};

export const getNetworkingProgressState = () =>
	networkingProgressStore.getState();
export const setNetworkingProgressState = (next: ModuleProgressState) =>
	networkingProgressStore.setState(next);
export const markNetworkingQuestionComplete = (id: NetworkingQuestionId) =>
	networkingProgressStore.markComplete(id);
export const resetNetworkingProgress = () => networkingProgressStore.reset();
