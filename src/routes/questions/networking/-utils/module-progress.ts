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

// --- Progress store ---

let completedIds: NetworkingQuestionId[] = [];
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

export const markNetworkingQuestionComplete = (id: NetworkingQuestionId) => {
	if (completedIds.includes(id)) return;
	completedIds = [...new Set([...completedIds, id])];
	emitChange();
};

export const useNetworkingProgress = () => {
	const ids = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
	return {
		completedIds: ids,
		completedCount: ids.length,
		totalQuestions: NETWORKING_QUESTIONS.length,
	};
};
