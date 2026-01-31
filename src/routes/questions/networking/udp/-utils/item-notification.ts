import type { BoardItemLocation } from "@/components/game/game-provider";

const ITEM_LABELS: Record<string, string> = {
	"syn-packet": "SYN",
	"syn-ack-packet": "SYN-ACK",
	"ack-packet": "ACK",
	"data-packet": "Packet",
	"ack-data": "ACK",
	frame: "Frame",
};

const TCP_STATE_LABELS: Record<string, string> = {
	pending: "Ready",
	waiting: "Waiting",
	"in-transit": "Sending...",
	delivered: "Delivered",
	acked: "ACKed",
	rejected: "Wrong client",
};

const FRAME_STATE_LABELS: Record<string, string> = {
	ready: "Ready",
	sending: "Sending...",
	sent: "Sent",
	rejected: "Send in order",
};

export const getUdpItemLabel = (itemType: string) =>
	ITEM_LABELS[itemType] ?? itemType;

export const getUdpStatusMessage = (item: BoardItemLocation): string | null => {
	if (item.type === "frame") {
		const state =
			typeof item.data?.state === "string" ? item.data.state : "ready";
		return FRAME_STATE_LABELS[state] ?? null;
	}

	if (
		item.type === "syn-packet" ||
		item.type === "syn-ack-packet" ||
		item.type === "ack-packet" ||
		item.type === "data-packet" ||
		item.type === "ack-data"
	) {
		const state =
			typeof item.data?.tcpState === "string" ? item.data.tcpState : "pending";
		return TCP_STATE_LABELS[state] ?? null;
	}

	return null;
};
