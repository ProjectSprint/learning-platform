import type { PlacedItem } from "@/components/game/game-provider";

type TcpStateLabel = {
	label: string;
};

const packetStateMessages: Record<string, TcpStateLabel> = {
	idle: { label: "Ready" },
	"in-transit": { label: "Sending..." },
	received: { label: "Received" },
	buffered: { label: "Buffered for ordering" },
	lost: { label: "Lost!" },
	processing: { label: "Processing..." },
	rejected: { label: "Rejected" },
};

const fileStateMessages: Record<string, TcpStateLabel> = {
	ready: { label: "Ready" },
	rejected: { label: "Too large" },
};

const flagStateMessages: Record<string, TcpStateLabel> = {
	idle: { label: "Ready" },
	"in-transit": { label: "Sending..." },
	received: { label: "Arrived" },
};


/**
 * Get display label for an item type.
 */
export const getTcpItemLabel = (itemType: string): string => {
	switch (itemType) {
		case "message-file":
			return "message.txt";
		case "notes-file":
			return "notes.txt";
		case "split-packet":
			return "Packet";
		case "syn-flag":
			return "SYN";
		case "syn-ack-flag":
			return "SYN-ACK";
		case "ack-flag":
			return "ACK";
		case "ack-packet":
			return "ACK";
		case "fin-flag":
			return "FIN";
		case "fin-ack-flag":
			return "FIN-ACK";
		default:
			return itemType.charAt(0).toUpperCase() + itemType.slice(1);
	}
};

/**
 * Get status message for a placed item.
 */
export const getTcpStatusMessage = (placedItem: PlacedItem): string | null => {
	const { type, data } = placedItem;
	const tcpState = typeof data?.tcpState === "string" ? data.tcpState : "idle";

	if (type === "message-file" || type === "notes-file") {
		const stateMessage = fileStateMessages[tcpState]?.label ?? "Ready";
		const fileLabel = type === "notes-file" ? "notes.txt" : "message.txt";
		return `${fileLabel} ${stateMessage}`;
	}

	if (type === "split-packet") {
		const seq = typeof data?.seq === "number" ? data.seq : undefined;
		const seqEnabled = data?.seqEnabled === true;
		const stateMessage = packetStateMessages[tcpState]?.label ?? "Ready";
		if (seqEnabled && typeof seq === "number") {
			return `Packet #${seq} ${stateMessage}`;
		}
		return stateMessage;
	}

	if (type === "ack-packet") {
		const ack = typeof data?.ack === "number" ? data.ack : undefined;
		const stateMessage = flagStateMessages[tcpState]?.label ?? "Arrived";
		return ack ? `ACK ${ack} ${stateMessage}` : `ACK ${stateMessage}`;
	}

	if (
		type === "syn-ack-flag" &&
		data?.direction === "server-to-client" &&
		tcpState === "in-transit"
	) {
		return "Receiving";
	}

	if (
		type === "syn-flag" ||
		type === "syn-ack-flag" ||
		type === "ack-flag" ||
		type === "fin-flag" ||
		type === "fin-ack-flag"
	) {
		return flagStateMessages[tcpState]?.label ?? "Ready";
	}

	return null;
};
