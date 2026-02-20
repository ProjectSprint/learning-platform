export type ActiveMode = "tcp" | "udp";

export type TcpPhase =
	| "handshake-synack"
	| "connected"
	| "data-transfer"
	| "chaos-new-client"
	| "chaos-timeout"
	| "chaos-redo"
	| "breaking-point";

export type UdpPhase = "intro" | "unicast" | "streaming" | "complete";

export type PacketReceiptStatus = "received" | "out-of-order" | "missing";
