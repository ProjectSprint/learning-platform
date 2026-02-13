export type AppKey = "word" | "calc" | "paint" | "music" | "video";

export type AppDefinition = {
	appKey: AppKey;
	entityId: string;
	name: string;
	icon: string;
	color: string;
};

export type ExecutionStep = "request" | "process" | "compose";

export type Notice = {
	message: string;
	tone: "info" | "error";
} | null;
