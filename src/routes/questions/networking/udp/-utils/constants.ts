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

export const TCP_INBOX_IDS = {
	a: "client-a-inbox",
	b: "client-b-inbox",
	c: "client-c-inbox",
	d: "client-d-inbox",
} as const;

export const UDP_CLIENT_CANVAS_IDS = {
	a: "client-a",
	b: "client-b",
	c: "client-c",
} as const;

export const TCP_CANVAS_ORDER: UdpCanvasKey[] = [
	"internet",
	"client-a-inbox",
	"client-b-inbox",
	"client-c-inbox",
];

export const UDP_CANVAS_ORDER: UdpCanvasKey[] = [
	"outbox",
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
	received: "received",
	incoming: "incoming",
	outgoing: "outgoing",
	dataPackets: "data-packets",
	frames: "frames",
} as const;

const isInitialClientId = (
	clientId: unknown,
): clientId is (typeof INITIAL_TCP_CLIENT_IDS)[number] =>
	INITIAL_TCP_CLIENT_IDS.includes(clientId as (typeof INITIAL_TCP_CLIENT_IDS)[number]);

export const buildSynPacket = (clientId: TcpClientId): InventoryItem => ({
	id: `syn-packet-${clientId}`,
	type: "syn-packet",
	name: `SYN from Client ${clientId.toUpperCase()}`,
	allowedPlaces: [
		"inventory",
		"internet",
		"client-a-inbox",
		"client-b-inbox",
		"client-c-inbox",
		"client-d-inbox",
	],
	icon: { icon: "mdi:handshake-outline", color: "#FBBF24" },
	data: { clientId, tcpState: "pending" },
});

export const buildReceivedSynPacket = (
	clientId: TcpClientId,
): InventoryItem => ({
	...buildSynPacket(clientId),
	allowedPlaces: ["inventory"],
	draggable: false,
	data: { clientId, tcpState: "delivered" },
});

export const buildSynAckPacket = (clientId: TcpClientId): InventoryItem => ({
	id: `syn-ack-packet-${clientId}`,
	type: "syn-ack-packet",
	name: `SYN-ACK to Client ${clientId.toUpperCase()}`,
	allowedPlaces: [
		"inventory",
		"internet",
		"client-a-inbox",
		"client-b-inbox",
		"client-c-inbox",
		"client-d-inbox",
	],
	icon: { icon: "mdi:handshake", color: "#F59E0B" },
	data: { clientId, tcpState: "pending" },
});

export const buildAckPacket = (clientId: TcpClientId): InventoryItem => ({
	id: `ack-packet-${clientId}`,
	type: "ack-packet",
	name: `ACK from Client ${clientId.toUpperCase()}`,
	allowedPlaces: [
		"inventory",
		"client-a-inbox",
		"client-b-inbox",
		"client-c-inbox",
		"client-d-inbox",
	],
	icon: { icon: "mdi:check-circle-outline", color: "#10B981" },
	data: { clientId, tcpState: "pending" },
});

export const buildDataPacket = (
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

export const buildFrameItem = (frameNumber: number): InventoryItem => ({
	id: `udp-frame-${frameNumber}`,
	type: "frame",
	name: `Frame ${frameNumber}`,
	allowedPlaces: ["inventory", "outbox"],
	icon: { icon: "mdi:filmstrip-box", color: "#8B5CF6" },
	data: { frameNumber, state: "ready" },
});

export const SYN_PACKETS: InventoryItem[] = INITIAL_TCP_CLIENT_IDS.map(
	(clientId) => buildSynPacket(clientId),
);
export const RECEIVED_SYN_PACKETS: InventoryItem[] =
	INITIAL_TCP_CLIENT_IDS.map((clientId) => buildReceivedSynPacket(clientId));

export const SYN_ACK_PACKETS: InventoryItem[] = TCP_CLIENT_IDS.map(
	(clientId) => buildSynAckPacket(clientId),
);

export const ACK_PACKETS: InventoryItem[] = TCP_CLIENT_IDS.map((clientId) =>
	buildAckPacket(clientId),
);

const DATA_PACKET_COUNT = 6;
export const DATA_PACKETS: InventoryItem[] = INITIAL_TCP_CLIENT_IDS.flatMap(
	(clientId) =>
		Array.from({ length: DATA_PACKET_COUNT }, (_, index) =>
			buildDataPacket(clientId, index + 1),
		),
);

export const FRAME_ITEMS: InventoryItem[] = Array.from(
	{ length: 6 },
	(_, index) => buildFrameItem(index + 1),
);

export const INVENTORY_GROUPS: InventoryGroupConfig[] = [
	{
		id: INVENTORY_GROUP_IDS.received,
		title: "Received",
		visible: true,
		items: RECEIVED_SYN_PACKETS,
	},
	{
		id: INVENTORY_GROUP_IDS.incoming,
		title: "Incoming Packets",
		visible: false,
		items: [],
	},
	{
		id: INVENTORY_GROUP_IDS.outgoing,
		title: "Server Response",
		visible: true,
		items: SYN_ACK_PACKETS.filter((packet) =>
			isInitialClientId(packet.data?.clientId),
		),
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

export const TCP_ITEM_IDS = [
	...SYN_PACKETS.map((item) => item.id),
	...SYN_ACK_PACKETS.map((item) => item.id),
	...ACK_PACKETS.map((item) => item.id),
	...DATA_PACKETS.map((item) => item.id),
];

export const UDP_ITEM_IDS = [...FRAME_ITEMS.map((item) => item.id)];
