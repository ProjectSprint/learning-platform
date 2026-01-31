import type {
	InventoryGroupConfig,
	Item,
} from "@/components/game/game-provider";
import {
	createGridCanvasConfig,
	createPuzzleConfigs,
	type GridCanvasConfig,
} from "../../-utils/grid-space";

export const QUESTION_ID = "udp-video-streaming";
export const QUESTION_TITLE = "📺 Stream movie.mp4 to 3 viewers";
export const QUESTION_DESCRIPTION =
	"Your viewers are waiting! Establish connections and deliver the video stream to all clients.";

const TOOLTIP_SYN = {
	content: "SYN starts a TCP handshake to establish a connection.",
	seeMoreHref:
		"https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Connection_establishment",
};

const TOOLTIP_SYN_ACK = {
	content: "SYN-ACK confirms the server received the SYN and is ready.",
	seeMoreHref:
		"https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Connection_establishment",
};

const TOOLTIP_ACK = {
	content: "ACK completes the TCP handshake so data can flow.",
	seeMoreHref:
		"https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Connection_establishment",
};

const TOOLTIP_DATA = {
	content: "A video packet that must be acknowledged in TCP.",
	seeMoreHref:
		"https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Reliable_delivery",
};

const TOOLTIP_FRAME = {
	content: "A UDP frame broadcast to all viewers without waiting for ACKs.",
	seeMoreHref: "https://en.wikipedia.org/wiki/User_Datagram_Protocol",
};

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
	"client-a-inbox",
	"client-b-inbox",
	"client-c-inbox",
	"internet",
];

export const UDP_CANVAS_ORDER: UdpCanvasKey[] = ["internet"];

export const CANVAS_CONFIGS: Record<UdpCanvasKey, GridCanvasConfig> = {
	internet: createGridCanvasConfig({
		id: "internet",
		name: "Internet",
		size: { base: [3, 1] },
		maxCapacity: 3,
	}),
	"client-a-inbox": createGridCanvasConfig({
		id: "client-a-inbox",
		name: "Client A",
		size: { base: [2, 2] },
		maxCapacity: 4,
	}),
	"client-b-inbox": createGridCanvasConfig({
		id: "client-b-inbox",
		name: "Client B",
		size: { base: [2, 2] },
		maxCapacity: 4,
	}),
	"client-c-inbox": createGridCanvasConfig({
		id: "client-c-inbox",
		name: "Client C",
		size: { base: [2, 2] },
		maxCapacity: 4,
	}),
	"client-d-inbox": createGridCanvasConfig({
		id: "client-d-inbox",
		name: "Client D",
		size: { base: [2, 2] },
		maxCapacity: 4,
	}),
	"client-a": createGridCanvasConfig({
		id: "client-a",
		name: "Client A",
		size: { base: [1, 1] },
		maxCapacity: 0,
	}),
	"client-b": createGridCanvasConfig({
		id: "client-b",
		name: "Client B",
		size: { base: [1, 1] },
		maxCapacity: 0,
	}),
	"client-c": createGridCanvasConfig({
		id: "client-c",
		name: "Client C",
		size: { base: [1, 1] },
		maxCapacity: 0,
	}),
};

export const CANVAS_PUZZLES = createPuzzleConfigs(CANVAS_CONFIGS);

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
	INITIAL_TCP_CLIENT_IDS.includes(
		clientId as (typeof INITIAL_TCP_CLIENT_IDS)[number],
	);

export const buildSynPacket = (clientId: TcpClientId): Item => ({
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
	tooltip: TOOLTIP_SYN,
});

export const buildReceivedSynPacket = (clientId: TcpClientId): Item => ({
	...buildSynPacket(clientId),
	allowedPlaces: ["inventory"],
	draggable: false,
	data: { clientId, tcpState: "delivered" },
});

export const buildReceivedAckPacket = (clientId: TcpClientId): Item => ({
	...buildAckPacket(clientId),
	allowedPlaces: ["inventory"],
	draggable: false,
	data: { clientId, tcpState: "delivered" },
});

export const buildSynAckPacket = (clientId: TcpClientId): Item => ({
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
	tooltip: TOOLTIP_SYN_ACK,
});

export const buildAckPacket = (clientId: TcpClientId): Item => ({
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
	tooltip: TOOLTIP_ACK,
});

export const buildDataPacket = (clientId: TcpClientId, seq: number): Item => ({
	id: `data-packet-${clientId}-${seq}`,
	type: "data-packet",
	name: `Packet ${seq} -> Client ${clientId.toUpperCase()}`,
	allowedPlaces: [
		"inventory",
		"internet",
		"client-a-inbox",
		"client-b-inbox",
		"client-c-inbox",
		"client-d-inbox",
	],
	icon: { icon: "mdi:filmstrip", color: "#60A5FA" },
	data: { clientId, seq, tcpState: "pending" },
	tooltip: TOOLTIP_DATA,
});

export const buildFrameItem = (frameNumber: number): Item => ({
	id: `udp-frame-${frameNumber}`,
	type: "frame",
	name: `Frame ${frameNumber}`,
	allowedPlaces: ["inventory", "internet"],
	icon: { icon: "mdi:filmstrip-box", color: "#8B5CF6" },
	data: { frameNumber, state: "ready" },
	tooltip: TOOLTIP_FRAME,
});

export const SYN_PACKETS: Item[] = INITIAL_TCP_CLIENT_IDS.map((clientId) =>
	buildSynPacket(clientId),
);
export const RECEIVED_SYN_PACKETS: Item[] = INITIAL_TCP_CLIENT_IDS.map(
	(clientId) => buildReceivedSynPacket(clientId),
);

export const SYN_ACK_PACKETS: Item[] = TCP_CLIENT_IDS.map((clientId) =>
	buildSynAckPacket(clientId),
);

export const ACK_PACKETS: Item[] = TCP_CLIENT_IDS.map((clientId) =>
	buildAckPacket(clientId),
);

export const DATA_PACKET_COUNT = 6;
export const DATA_PACKETS: Item[] = INITIAL_TCP_CLIENT_IDS.flatMap((clientId) =>
	Array.from({ length: DATA_PACKET_COUNT }, (_, index) =>
		buildDataPacket(clientId, index + 1),
	),
);

export const FRAME_ITEMS: Item[] = Array.from({ length: 6 }, (_, index) =>
	buildFrameItem(index + 1),
);

export const INVENTORY_GROUPS: InventoryGroupConfig[] = [
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
		id: INVENTORY_GROUP_IDS.received,
		title: "Received",
		visible: true,
		items: RECEIVED_SYN_PACKETS,
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
