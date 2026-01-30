export type ActiveMode = "tcp" | "udp";

export type TcpPhase =
	| "handshake-syn"
	| "handshake-synack"
	| "handshake-ack"
	| "connected"
	| "data-transfer"
	| "chaos-new-client"
	| "chaos-timeout"
	| "chaos-redo"
	| "breaking-point";

export type UdpPhase = "intro" | "streaming" | "complete";

export type PacketReceiptStatus = "received" | "out-of-order" | "missing";
