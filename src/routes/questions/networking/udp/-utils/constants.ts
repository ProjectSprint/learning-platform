import type {
	InventoryGroupConfig,
	InventoryItem,
	PuzzleConfig,
} from "@/components/game/game-provider";

export const QUESTION_ID = "udp-video-streaming";
export const QUESTION_TITLE = "📺 Stream movie.mp4 to 3 viewers";
export const QUESTION_DESCRIPTION =
	"Your viewers are waiting! Establish connections and deliver the video stream to all clients.";

export const TCP_CLIENT_IDS = ["a", "b", "c", "d"] as const;
export const INITIAL_TCP_CLIENT_IDS = ["a", "b", "c"] as const;
export const UDP_CLIENT_IDS = ["a", "b", "c"] as const;

export type TcpClientId = (typeof TCP_CLIENT_IDS)[number];
export type UdpClientId = (typeof UDP_CLIENT_IDS)[number];

export type UdpCanvasKey =
	| "internet"
	| "client-a-inbox"
	| "client-b-inbox"
	| "client-c-inbox"
	| "client-d-inbox"
	| "outbox"
	| "client-a"
	| "client-b"
	| "client-c";

export const TCP_CANVAS_ORDER: UdpCanvasKey[] = [
	"internet",
	"client-a-inbox",
	"client-b-inbox",
	"client-c-inbox",
	"client-d-inbox",
];

export const UDP_CANVAS_ORDER: UdpCanvasKey[] = [
	"outbox",
	"client-a",
	"client-b",
	"client-c",
];

export const CANVAS_CONFIGS: Record<UdpCanvasKey, PuzzleConfig> = {
	internet: {
		id: "udp-internet",
		title: "Internet",
		puzzleId: "internet",
		columns: 4,
		rows: 1,
		maxItems: 4,
	},
	"client-a-inbox": {
		id: "udp-client-a-inbox",
		title: "Client A",
		puzzleId: "client-a-inbox",
		columns: 2,
		rows: 2,
		maxItems: 4,
	},
	"client-b-inbox": {
		id: "udp-client-b-inbox",
		title: "Client B",
		puzzleId: "client-b-inbox",
		columns: 2,
		rows: 2,
		maxItems: 4,
	},
	"client-c-inbox": {
		id: "udp-client-c-inbox",
		title: "Client C",
		puzzleId: "client-c-inbox",
		columns: 2,
		rows: 2,
		maxItems: 4,
	},
	"client-d-inbox": {
		id: "udp-client-d-inbox",
		title: "Client D",
		puzzleId: "client-d-inbox",
		columns: 2,
		rows: 2,
		maxItems: 4,
	},
	outbox: {
		id: "udp-outbox",
		title: "Outbox",
		puzzleId: "outbox",
		columns: 1,
		rows: 1,
		maxItems: 1,
	},
	"client-a": {
		id: "udp-client-a",
		title: "Client A",
		puzzleId: "client-a",
		columns: 1,
		rows: 1,
		maxItems: 0,
	},
	"client-b": {
		id: "udp-client-b",
		title: "Client B",
		puzzleId: "client-b",
		columns: 1,
		rows: 1,
		maxItems: 0,
	},
	"client-c": {
		id: "udp-client-c",
		title: "Client C",
		puzzleId: "client-c",
		columns: 1,
		rows: 1,
		maxItems: 0,
	},
};

export const INVENTORY_GROUP_IDS = {
	incoming: "incoming",
	outgoing: "outgoing",
	dataPackets: "data-packets",
	frames: "frames",
} as const;

const createSynPacket = (clientId: TcpClientId): InventoryItem => ({
	id: `syn-packet-${clientId}`,
	type: "syn-packet",
	name: `SYN from Client ${clientId.toUpperCase()}`,
	allowedPlaces: ["inventory", "internet", `client-${clientId}-inbox`],
	icon: { icon: "mdi:handshake-outline", color: "#FBBF24" },
	data: { clientId, tcpState: "pending" },
});

const createSynAckPacket = (clientId: TcpClientId): InventoryItem => ({
	id: `syn-ack-packet-${clientId}`,
	type: "syn-ack-packet",
	name: `SYN-ACK to Client ${clientId.toUpperCase()}`,
	allowedPlaces: ["inventory", "internet"],
	icon: { icon: "mdi:handshake", color: "#F59E0B" },
	data: { clientId, tcpState: "pending" },
});

const createAckPacket = (clientId: TcpClientId): InventoryItem => ({
	id: `ack-packet-${clientId}`,
	type: "ack-packet",
	name: `ACK from Client ${clientId.toUpperCase()}`,
	allowedPlaces: ["inventory", `client-${clientId}-inbox`],
	icon: { icon: "mdi:check-circle-outline", color: "#10B981" },
	data: { clientId, tcpState: "pending" },
});

const createDataPacket = (
	clientId: TcpClientId,
	seq: number,
): InventoryItem => ({
	id: `data-packet-${clientId}-${seq}`,
	type: "data-packet",
	name: `Packet ${seq} -> Client ${clientId.toUpperCase()}`,
	allowedPlaces: ["inventory", "internet"],
	icon: { icon: "mdi:filmstrip", color: "#60A5FA" },
	data: { clientId, seq, tcpState: "pending" },
});

const createFrameItem = (frameNumber: number): InventoryItem => ({
	id: `udp-frame-${frameNumber}`,
	type: "frame",
	name: `Frame ${frameNumber}`,
	allowedPlaces: ["inventory", "outbox"],
	icon: { icon: "mdi:filmstrip-box", color: "#8B5CF6" },
	data: { frameNumber, state: "ready" },
});

export const SYN_PACKETS: InventoryItem[] = INITIAL_TCP_CLIENT_IDS.map(
	(clientId) => createSynPacket(clientId),
);

export const SYN_ACK_PACKETS: InventoryItem[] = TCP_CLIENT_IDS.map(
	(clientId) => createSynAckPacket(clientId),
);

export const ACK_PACKETS: InventoryItem[] = TCP_CLIENT_IDS.map((clientId) =>
	createAckPacket(clientId),
);

const DATA_PACKET_COUNT = 6;
export const DATA_PACKETS: InventoryItem[] = INITIAL_TCP_CLIENT_IDS.flatMap(
	(clientId) =>
		Array.from({ length: DATA_PACKET_COUNT }, (_, index) =>
			createDataPacket(clientId, index + 1),
		),
);

export const FRAME_ITEMS: InventoryItem[] = Array.from(
	{ length: 6 },
	(_, index) => createFrameItem(index + 1),
);

export const INVENTORY_GROUPS: InventoryGroupConfig[] = [
	{
		id: INVENTORY_GROUP_IDS.incoming,
		title: "Incoming Packets",
		visible: true,
		items: SYN_PACKETS,
	},
	{
		id: INVENTORY_GROUP_IDS.outgoing,
		title: "Server Response",
		visible: false,
		items: SYN_ACK_PACKETS,
	},
	{
		id: INVENTORY_GROUP_IDS.dataPackets,
		title: "Video Packets",
		visible: false,
		items: DATA_PACKETS,
	},
	{
		id: INVENTORY_GROUP_IDS.frames,
		title: "Video Frames",
		visible: false,
		items: FRAME_ITEMS,
	},
];

export const PACKET_LIKE_TYPES = [
	"syn-packet",
	"syn-ack-packet",
	"ack-packet",
	"data-packet",
	"ack-data",
	"frame",
];
