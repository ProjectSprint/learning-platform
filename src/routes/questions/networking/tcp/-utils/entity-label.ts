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
