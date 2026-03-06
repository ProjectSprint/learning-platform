import type { Item } from "@/components/game/engine/game-provider";
import type {
	GridSpaceConfig,
	PoolSpaceConfig,
} from "@/components/game/types/space";

export const QUESTION_ID = "tcp-fragmentation";
export const QUESTION_TITLE = "📄 Deliver message.txt";
export const QUESTION_DESCRIPTION =
	"Large files must be split, ordered, and delivered reliably. Build the missing TCP pieces to get message.txt across.";
export const TERMINAL_PROMPT =
	"Connection closed. Use the terminal to inspect the exchange.";

export type TcpSpaceKey = "splitter" | "internet" | "server";

export const SPACE_CONFIGS: Record<
	TcpSpaceKey,
	GridSpaceConfig<TcpSpaceKey>
> = {
	splitter: {
		id: "splitter",
		name: "Content Splitter",
		rows: 1,
		cols: 1,
		metrics: {
			cellWidth: { base: 64 },
			cellHeight: { base: 64 },
			gapX: { base: 4 },
			gapY: { base: 4 },
		},
		maxCapacity: 1,
	},
	internet: {
		id: "internet",
		name: "Internet",
		rows: 1,
		cols: 3,
		metrics: {
			cellWidth: { base: 64 },
			cellHeight: { base: 64 },
			gapX: { base: 4 },
			gapY: { base: 4 },
		},
		maxCapacity: 3,
	},
	server: {
		id: "server",
		name: "Server",
		rows: 4,
		cols: 3,
		metrics: {
			cellWidth: { base: 64 },
			cellHeight: { base: 64 },
			gapX: { base: 4 },
			gapY: { base: 4 },
		},
		maxCapacity: 12,
	},
};

export const INVENTORY_POOL_CONFIG: PoolSpaceConfig<
	TcpSpaceKey | "inventory" | "received" | "tcp-tools"
> = {
	id: "inventory",
	name: "data",
	metadata: { visible: true },
};

export const RECEIVED_POOL_CONFIG: PoolSpaceConfig<
	TcpSpaceKey | "inventory" | "received" | "tcp-tools"
> = {
	id: "received",
	name: "Received",
	metadata: { visible: false },
};

export const TCP_TOOLS_POOL_CONFIG: PoolSpaceConfig<
	TcpSpaceKey | "inventory" | "received" | "tcp-tools"
> = {
	id: "tcp-tools",
	name: "tcp tools",
	metadata: { visible: true },
};

export const INVENTORY_GROUP_IDS = {
	files: "files",
	split: "split",
	tcpTools: "tcp-tools",
	received: "received",
} as const;

export const FILE_ITEM_ID = "message-file-1";
export const NOTES_FILE_ITEM_ID = "notes-file-1";

const TOOLTIP_MESSAGE_FILE = {
	content:
		"A large file that must be split into smaller packets before it can travel across the network.",
	seeMoreHref: "https://en.wikipedia.org/wiki/File_size",
};

const TOOLTIP_NOTES_FILE = {
	content:
		"Another file that needs to be split into packets before it can traverse the network.",
	seeMoreHref: "https://en.wikipedia.org/wiki/File_size",
};

const TOOLTIP_SPLIT_PACKET = {
	content:
		"A fragment of the original file. It must be delivered in order to reassemble the message.",
	seeMoreHref: "https://en.wikipedia.org/wiki/IP_fragmentation",
};

const TOOLTIP_SYN = {
	content: "SYN starts a TCP handshake to establish a connection.",
	seeMoreHref:
		"https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Connection_establishment",
};

const TOOLTIP_ACK = {
	content: "ACK completes the handshake so data can flow.",
	seeMoreHref:
		"https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Connection_establishment",
};

const TOOLTIP_FIN = {
	content: "FIN closes a TCP connection cleanly after data transfer.",
	seeMoreHref:
		"https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Connection_termination",
};

export const FILE_INVENTORY_ITEMS: Item[] = [
	{
		id: FILE_ITEM_ID,
		type: "message-file",
		name: "message.txt",
		allowedPlaces: ["inventory", "internet", "splitter", "server"],
		icon: { icon: "mdi:file-document-outline", color: "#93C5FD" },
		data: { tcpState: "ready" },
		tooltip: TOOLTIP_MESSAGE_FILE,
	},
];

export const NOTES_FILE_ITEM: Item = {
	id: NOTES_FILE_ITEM_ID,
	type: "notes-file",
	name: "notes.txt",
	allowedPlaces: ["inventory", "internet", "splitter", "server"],
	icon: { icon: "mdi:file-document-outline", color: "#60A5FA" },
	data: { tcpState: "ready" },
	tooltip: TOOLTIP_NOTES_FILE,
};

export const MESSAGE_PACKET_IDS = [
	"split-packet-1",
	"split-packet-2",
	"split-packet-3",
];

export const NOTES_PACKET_IDS = [
	"notes-packet-1",
	"notes-packet-2",
	"notes-packet-3",
	"notes-packet-4",
	"notes-packet-5",
	"notes-packet-6",
];

export const SPLIT_PACKET_IDS = [...MESSAGE_PACKET_IDS, ...NOTES_PACKET_IDS];

export const MESSAGE_PACKET_ITEMS: Item[] = MESSAGE_PACKET_IDS.map(
	(packetId, index) => ({
		id: packetId,
		type: "split-packet",
		name: "Fragment",
		allowedPlaces: ["inventory", "internet", "server"],
		icon: { icon: "mdi:package-variant", color: "#A3A3A3" },
		data: {
			seq: index + 1,
			seqEnabled: false,
			tcpState: "idle",
			fileKey: "message",
		},
		tooltip: TOOLTIP_SPLIT_PACKET,
	}),
);

export const NOTES_PACKET_ITEMS: Item[] = NOTES_PACKET_IDS.map(
	(packetId, index) => ({
		id: packetId,
		type: "split-packet",
		name: "Fragment",
		allowedPlaces: ["inventory", "internet", "server"],
		icon: { icon: "mdi:package-variant", color: "#A3A3A3" },
		data: {
			seq: index + 1,
			seqEnabled: false,
			tcpState: "idle",
			fileKey: "notes",
		},
		tooltip: TOOLTIP_SPLIT_PACKET,
	}),
);

export const TCP_TOOL_ITEMS: Record<"syn" | "ack" | "fin", Item> = {
	syn: {
		id: "syn-flag-1",
		type: "syn-flag",
		name: "SYN",
		allowedPlaces: ["tcp-tools", "internet", "server"],
		icon: { icon: "mdi:flag-outline", color: "#FBBF24" },
		data: { tcpState: "idle" },
		tooltip: TOOLTIP_SYN,
	},
	ack: {
		id: "ack-flag-1",
		type: "ack-flag",
		name: "ACK",
		allowedPlaces: ["tcp-tools", "internet", "server"],
		icon: { icon: "mdi:flag", color: "#10B981" },
		data: { tcpState: "idle" },
		tooltip: TOOLTIP_ACK,
	},
	fin: {
		id: "fin-flag-1",
		type: "fin-flag",
		name: "FIN",
		allowedPlaces: ["tcp-tools", "internet", "server"],
		icon: { icon: "mdi:flag-remove", color: "#F97316" },
		data: { tcpState: "idle" },
		tooltip: TOOLTIP_FIN,
	},
};

export const SYSTEM_PACKET_ITEMS: Record<"synAck" | "finAck", Item> = {
	synAck: {
		id: "syn-ack-flag-1",
		type: "syn-ack-flag",
		name: "SYN-ACK",
		allowedPlaces: ["inventory", "internet"],
		icon: { icon: "mdi:flag-checkered", color: "#F59E0B" },
		data: { tcpState: "idle" },
		draggable: false,
	},
	finAck: {
		id: "fin-ack-flag-1",
		type: "fin-ack-flag",
		name: "FIN-ACK",
		allowedPlaces: ["inventory", "internet"],
		icon: { icon: "mdi:flag-remove-outline", color: "#FB923C" },
		data: { tcpState: "idle" },
		draggable: false,
	},
};

export const MTU_HELP_LINK =
	"https://en.wikipedia.org/wiki/Maximum_transmission_unit";

export const PACKET_LIKE_TYPES = [
	"message-file",
	"notes-file",
	"split-packet",
	"syn-flag",
	"ack-flag",
	"syn-ack-flag",
	"fin-flag",
	"fin-ack-flag",
	"ack-packet",
];
