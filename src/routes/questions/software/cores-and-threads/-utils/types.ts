export type CoresPhase =
	| "boot"
	| "single-core-success"
	| "overload"
	| "io-wall"
	| "threads"
	| "complete";

export type RequestMethod = "GET" | "POST";
export type RequestPath = "/" | "/login";

export type RequestStatus =
	| "queued"
	| "processing"
	| "waiting-io"
	| "io-ready"
	| "timeout"
	| "complete";

export type IoSubtaskStatus = "request" | "response";

export type CoreLaneId = "lane-1" | "lane-2";

export type IoSpaceId = "disk-path" | "db-path";

export type UpgradeItemType =
	| "core"
	| "thread"
	| "marketing"
	| "inbound-marketing";

export type Metrics = {
	requestsPerSec: number;
	queueDepth: number;
	timeoutCount: number;
	coreCount: number;
	threadedLaneCount: number;
};

export type Notice = {
	message: string;
	tone: "info" | "error";
} | null;
