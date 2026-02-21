import {
	createProgressStore,
	useProgressSnapshot,
} from "../../-utils/create-progress-store";

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

export const networkingProgressStore =
	createProgressStore<NetworkingQuestionId>();

export const useNetworkingProgress = () =>
	useProgressSnapshot(networkingProgressStore, NETWORKING_QUESTIONS.length);

export const getNetworkingProgressState = () =>
	networkingProgressStore.getState();
export const setNetworkingProgressState = (next: {
	completedIds: NetworkingQuestionId[];
}) => networkingProgressStore.setState(next);
export const markNetworkingQuestionComplete = (id: NetworkingQuestionId) =>
	networkingProgressStore.markComplete(id);
export const resetNetworkingProgress = () => networkingProgressStore.reset();
