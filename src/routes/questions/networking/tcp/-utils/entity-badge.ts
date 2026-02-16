import type { SpaceItemLocation } from "@/components/game/engine/game-provider";

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
	rejected: { label: "Can't be processed" },
};

const fileStateMessages: Record<string, TcpStateLabel> = {
	ready: { label: "Ready" },
	"in-transit": { label: "Sending..." },
	processing: { label: "Processing..." },
	unknown: { label: "Unknown" },
	rejected: { label: "Too large!" },
};

const flagStateMessages: Record<string, TcpStateLabel> = {
	idle: { label: "Ready" },
	"in-transit": { label: "Sending..." },
	received: { label: "Arrived" },
};

/**
 * Get status message for a placed item.
 */
export const getTcpStatusMessage = (
	placedItem: SpaceItemLocation,
): string | null => {
	const { type, data } = placedItem;
	const tcpState = typeof data?.tcpState === "string" ? data.tcpState : "idle";

	if (type === "message-file" || type === "notes-file") {
		const stateMessage = fileStateMessages[tcpState]?.label ?? "Ready";
		return stateMessage;
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
