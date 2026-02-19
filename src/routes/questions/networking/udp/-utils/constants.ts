import type {
	InventoryGroupConfig,
	Item,
} from "@/components/game/engine/game-provider";
import type {
	CustomSpaceConfig,
	GridSpaceConfig,
	PoolSpaceConfig,
} from "@/components/game/types/space";

export const QUESTION_ID = "udp-video-streaming";
export const QUESTION_TITLE = "📺 Stream movie.mp4 to 3 viewers";
export const QUESTION_DESCRIPTION =
	"Your viewers are waiting! Establish connections and deliver the video stream to all clients.";
export const TERMINAL_PROMPT = "Terminal ready.";

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

const TOOLTIP_UNICAST = {
	content:
		"A unicast response from a client confirming they are listening on the UDP port.",
	seeMoreHref: "https://en.wikipedia.org/wiki/Unicast",
};

export const TCP_CLIENT_IDS = ["a", "b", "c", "d"] as const;
export const INITIAL_TCP_CLIENT_IDS = ["a", "b", "c"] as const;
export const UDP_CLIENT_IDS = ["a", "b", "c"] as const;

export type TcpClientId = (typeof TCP_CLIENT_IDS)[number];
export type UdpClientId = (typeof UDP_CLIENT_IDS)[number];

export type GridSpaceKey = "internet";

export type CustomSpaceKey = "clients";

export const SHARED_CLIENT_SPACE_ID = "clients" as const;

export const GRID_SPACE_CONFIGS: Record<
	GridSpaceKey,
	GridSpaceConfig<GridSpaceKey>
> = {
	internet: {
		id: "internet",
		name: "Internet",
		rows: 1,
		cols: 3,
		metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
		maxCapacity: 3,
	},
};

export const CUSTOM_SPACE_CONFIGS: Record<
	CustomSpaceKey,
	CustomSpaceConfig<CustomSpaceKey>
> = {
	clients: { id: "clients", name: "Clients" },
};

export const INVENTORY_POOL_CONFIG: PoolSpaceConfig<
	GridSpaceKey | CustomSpaceKey | "inventory" | "packets" | "received"
> = {
	id: "inventory",
	name: "tcp tools",
	metadata: { visible: true },
};

export const PACKETS_POOL_CONFIG: PoolSpaceConfig<
	GridSpaceKey | CustomSpaceKey | "inventory" | "packets" | "received"
> = {
	id: "packets",
	name: "Packets",
	metadata: { visible: true },
};

export const RECEIVED_POOL_CONFIG: PoolSpaceConfig<
	GridSpaceKey | CustomSpaceKey | "inventory" | "packets" | "received"
> = {
	id: "received",
	name: "Received",
	metadata: { visible: true },
};

export const POOL_GROUP_IDS = {
	received: "received",
	incoming: "incoming",
	outgoing: "outgoing",
	dataPackets: "data-packets",
	frames: "frames",
} as const;

const isInitialClientId = (
	clientId: unknown,
): clientId is (typeof INITIAL_TCP_CLIENT_IDS)[number] =>
	typeof clientId === "string" &&
	INITIAL_TCP_CLIENT_IDS.some((id) => id === clientId);

export const buildSynPacket = (clientId: TcpClientId): Item => ({
	id: `syn-packet-${clientId}`,
	type: "syn-packet",
	name: `SYN from Client ${clientId.toUpperCase()}`,
	allowedPlaces: ["packets", "internet"],
	icon: { icon: "mdi:handshake-outline", color: "#FBBF24" },
	data: { clientId, tcpState: "pending" },
	tooltip: TOOLTIP_SYN,
});

export const buildReceivedSynPacket = (clientId: TcpClientId): Item => ({
	...buildSynPacket(clientId),
	allowedPlaces: ["received"],
	draggable: false,
	data: { clientId, tcpState: "delivered" },
});

export const buildReceivedAckPacket = (clientId: TcpClientId): Item => ({
	...buildAckPacket(clientId),
	id: `received-ack-packet-${clientId}`,
	allowedPlaces: ["received"],
	draggable: false,
	data: { clientId, tcpState: "delivered" },
});

export const buildSynAckPacket = (clientId: TcpClientId): Item => ({
	id: `syn-ack-packet-${clientId}`,
	type: "syn-ack-packet",
	name: `SYN-ACK to Client ${clientId.toUpperCase()}`,
	allowedPlaces: ["inventory", "internet"],
	icon: { icon: "mdi:handshake", color: "#F59E0B" },
	data: { clientId, tcpState: "pending" },
	tooltip: TOOLTIP_SYN_ACK,
});

export const buildAckPacket = (clientId: TcpClientId): Item => ({
	id: `ack-packet-${clientId}`,
	type: "ack-packet",
	name: `ACK from Client ${clientId.toUpperCase()}`,
	allowedPlaces: ["packets", "internet"],
	icon: { icon: "mdi:check-circle-outline", color: "#10B981" },
	data: { clientId, tcpState: "pending" },
	tooltip: TOOLTIP_ACK,
});

export const buildDataPacket = (clientId: TcpClientId, seq: number): Item => ({
	id: `data-packet-${clientId}-${seq}`,
	type: "data-packet",
	name: `Packet ${seq} -> Client ${clientId.toUpperCase()}`,
	allowedPlaces: ["packets", "internet"],
	icon: { icon: "mdi:filmstrip", color: "#60A5FA" },
	data: { clientId, seq, tcpState: "pending" },
	tooltip: TOOLTIP_DATA,
});

export const buildFrameItem = (frameNumber: number): Item => ({
	id: `udp-frame-${frameNumber}`,
	type: "frame",
	name: `Frame ${frameNumber}`,
	allowedPlaces: ["packets", "internet"],
	icon: { icon: "mdi:filmstrip-box", color: "#8B5CF6" },
	data: { frameNumber, state: "ready" },
	tooltip: TOOLTIP_FRAME,
});

export const buildUnicastItem = (clientId: UdpClientId): Item => ({
	id: `unicast-${clientId}`,
	type: "unicast-response",
	name: `Unicast from Client ${clientId.toUpperCase()}`,
	allowedPlaces: ["internet", "received"],
	icon: { icon: "mdi:access-point", color: "#38BDF8" },
	data: { clientId, state: "waiting" },
	tooltip: TOOLTIP_UNICAST,
});

export const SYN_PACKETS: Item[] = INITIAL_TCP_CLIENT_IDS.map((clientId) =>
	buildSynPacket(clientId),
);
export const RECEIVED_SYN_PACKETS: Item[] = INITIAL_TCP_CLIENT_IDS.map(
	(clientId) => buildReceivedSynPacket(clientId),
);

export const RECEIVED_ACK_PACKETS: Item[] = TCP_CLIENT_IDS.map((clientId) =>
	buildReceivedAckPacket(clientId),
);

export const SYN_ACK_PACKETS: Item[] = TCP_CLIENT_IDS.map((clientId) =>
	buildSynAckPacket(clientId),
);

export const ACK_PACKETS: Item[] = TCP_CLIENT_IDS.map((clientId) =>
	buildAckPacket(clientId),
);

export const DATA_PACKET_COUNT = 6;
export const DATA_PACKETS: Item[] = TCP_CLIENT_IDS.flatMap((clientId) =>
	Array.from({ length: DATA_PACKET_COUNT }, (_, index) =>
		buildDataPacket(clientId, index + 1),
	),
);

export const FRAME_ITEMS: Item[] = Array.from({ length: 6 }, (_, index) =>
	buildFrameItem(index + 1),
);

export const UNICAST_ITEMS: Item[] = UDP_CLIENT_IDS.map((clientId) =>
	buildUnicastItem(clientId),
);

export const INVENTORY_GROUPS: InventoryGroupConfig[] = [
	{
		id: POOL_GROUP_IDS.incoming,
		title: "Incoming Packets",
		visible: false,
		items: [],
	},
	{
		id: POOL_GROUP_IDS.outgoing,
		title: "Server Response",
		visible: true,
		items: SYN_ACK_PACKETS.filter((packet) =>
			isInitialClientId(packet.data?.clientId),
		),
	},
	{
		id: POOL_GROUP_IDS.dataPackets,
		title: "Video Packets",
		visible: false,
		items: DATA_PACKETS,
	},
	{
		id: POOL_GROUP_IDS.received,
		title: "Received",
		visible: true,
		items: RECEIVED_SYN_PACKETS,
	},
	{
		id: POOL_GROUP_IDS.frames,
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
	"unicast-response",
];

export const TCP_ITEM_IDS = [
	...SYN_PACKETS.map((item) => item.id),
	...SYN_ACK_PACKETS.map((item) => item.id),
	...ACK_PACKETS.map((item) => item.id),
	...DATA_PACKETS.map((item) => item.id),
];

export const UDP_ITEM_IDS = [
	...FRAME_ITEMS.map((item) => item.id),
	...UNICAST_ITEMS.map((item) => item.id),
];
