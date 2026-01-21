import type {
	CanvasConfig,
	InventoryItem,
} from "@/components/game/game-provider";

export const QUESTION_ID = "tcp-fragmentation";
export const QUESTION_TITLE = "📄 Deliver message.txt";
export const QUESTION_DESCRIPTION =
	"Large files must be split, ordered, and delivered reliably. Build the missing TCP pieces to get message.txt across.";
export const TERMINAL_PROMPT =
	"Connection closed. Use the terminal to inspect the exchange.";

export type TcpCanvasKey = "splitter" | "internet" | "server";

const getCanvasTitle = (key: string) => {
	switch (key) {
		case "splitter":
			return "Content Splitter";
		case "internet":
			return "Internet";
		case "server":
			return "Server";
		default:
			return key;
	}
};

export const CANVAS_ORDER: TcpCanvasKey[] = ["splitter", "internet", "server"];

export const CANVAS_CONFIGS: Record<TcpCanvasKey, CanvasConfig> = {
	splitter: {
		id: "tcp-splitter",
		stateKey: "splitter",
		columns: 1,
		rows: 1,
		maxItems: 1,
	},
	internet: {
		id: "tcp-internet",
		stateKey: "internet",
		columns: 3,
		rows: 1,
		maxItems: 3,
	},
	server: {
		id: "tcp-server",
		stateKey: "server",
		columns: 3,
		rows: 4,
		maxItems: 12,
	},
};

export const INVENTORY_GROUP_IDS = {
	files: "files",
	split: "split",
	tcpTools: "tcp-tools",
	received: "received",
} as const;

export const FILE_ITEM_ID = "message-file-1";
export const NOTES_FILE_ITEM_ID = "notes-file-1";

export const FILE_INVENTORY_ITEMS: InventoryItem[] = [
	{
		id: FILE_ITEM_ID,
		type: "message-file",
		name: "message.txt",
		allowedPlaces: ["inventory", "internet", "splitter"],
		icon: { icon: "mdi:file-document-outline", color: "#93C5FD" },
		data: { tcpState: "ready" },
	},
];

export const NOTES_FILE_ITEM: InventoryItem = {
	id: NOTES_FILE_ITEM_ID,
	type: "notes-file",
	name: "notes.txt",
	allowedPlaces: ["inventory", "internet", "splitter"],
	icon: { icon: "mdi:file-document-outline", color: "#60A5FA" },
	data: { tcpState: "ready" },
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

export const MESSAGE_PACKET_ITEMS: InventoryItem[] = MESSAGE_PACKET_IDS.map(
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
	}),
);

export const NOTES_PACKET_ITEMS: InventoryItem[] = NOTES_PACKET_IDS.map(
	(packetId, index) => ({
		id: packetId,
		type: "split-packet",
		name: `Packet #${index + 1}`,
		allowedPlaces: ["inventory", "internet", "server"],
		icon: { icon: "mdi:package-variant", color: "#38BDF8" },
		data: {
			seq: index + 1,
			seqEnabled: true,
			tcpState: "idle",
			fileKey: "notes",
		},
	}),
);

export const TCP_TOOL_ITEMS: Record<"syn" | "ack" | "fin", InventoryItem> = {
	syn: {
		id: "syn-flag-1",
		type: "syn-flag",
		name: "SYN",
		allowedPlaces: ["inventory", "internet", "server"],
		icon: { icon: "mdi:flag-outline", color: "#FBBF24" },
		data: { tcpState: "idle" },
	},
	ack: {
		id: "ack-flag-1",
		type: "ack-flag",
		name: "ACK",
		allowedPlaces: ["inventory", "internet", "server"],
		icon: { icon: "mdi:flag", color: "#10B981" },
		data: { tcpState: "idle" },
	},
	fin: {
		id: "fin-flag-1",
		type: "fin-flag",
		name: "FIN",
		allowedPlaces: ["inventory", "internet", "server"],
		icon: { icon: "mdi:flag-remove", color: "#F97316" },
		data: { tcpState: "idle" },
	},
};

export const SYSTEM_PACKET_ITEMS: Record<"synAck" | "finAck", InventoryItem> = {
	synAck: {
		id: "syn-ack-flag-1",
		type: "syn-ack-flag",
		name: "SYN-ACK",
		allowedPlaces: ["inventory", "internet"],
		icon: { icon: "mdi:flag-checkered", color: "#F59E0B" },
		data: { tcpState: "idle" },
	},
	finAck: {
		id: "fin-ack-flag-1",
		type: "fin-ack-flag",
		name: "FIN-ACK",
		allowedPlaces: ["inventory", "internet"],
		icon: { icon: "mdi:flag-remove-outline", color: "#FB923C" },
		data: { tcpState: "idle" },
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
