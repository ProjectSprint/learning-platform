export type CoresPhase =
	| "boot"
	| "single-core-success"
	| "overload"
	| "add-cores"
	| "io-wall"
	| "threads"
	| "complete";

export type RequestMethod = "GET" | "POST";
export type RequestPath = "/" | "/login";

export type RequestStatus =
	| "queued"
	| "processing"
	| "waiting-io"
	| "timeout"
	| "complete";

export type IoSubtaskStatus = "request" | "response";

export type CoreLaneId = "lane-1" | "lane-2" | "lane-3" | "lane-4";

export type Metrics = {
	requestsPerSec: number;
	queueDepth: number;
	timeoutCount: number;
	coreCount: number;
	threadsEnabled: boolean;
};

export type Notice = {
	message: string;
	tone: "info" | "error";
} | null;
