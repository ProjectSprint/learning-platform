import type { PlacedItem } from "@/components/game/game-provider";

const ITEM_LABELS: Record<string, string> = {
	"syn-packet": "SYN Packet",
	"syn-ack-packet": "SYN-ACK Packet",
	"ack-packet": "ACK Packet",
	"data-packet": "Video Packet",
	"ack-data": "Data ACK",
	frame: "Video Frame",
};

export const getUdpItemLabel = (itemType: string) =>
	ITEM_LABELS[itemType] ?? itemType;

export const getUdpStatusMessage = (_item: PlacedItem) => null;
