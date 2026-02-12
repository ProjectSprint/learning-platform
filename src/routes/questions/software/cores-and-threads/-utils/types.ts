export type CoreMode = "single-core" | "dual-core" | "parallel";

export type CorePhase =
	| "single-explore"
	| "single-execute"
	| "single-pain"
	| "single-wall"
	| "dual-idle"
	| "dual-scheduler"
	| "dual-limit"
	| "parallel-intro"
	| "parallel-split"
	| "parallel-conflict"
	| "parallel-lock"
	| "parallel-complete";

export type CoreLaneId = "core-1" | "core-2";

export type AppKey = "word" | "calc" | "paint" | "music" | "video";

export type TaskStatus =
	| "queued"
	| "processing"
	| "done"
	| "blocked"
	| "locked"
	| "conflict";

export type Notice = {
	message: string;
	tone: "info" | "error";
} | null;

export type AppDefinition = {
	appKey: AppKey;
	entityId: string;
	name: string;
	icon: string;
	color: string;
	weight: "light" | "medium" | "heavy";
};

export type TaskDefinition = {
	taskId: string;
	appKey: AppKey;
	name: string;
	durationMs: number;
	dependsOn: string[];
	resource?: "gpu";
};
