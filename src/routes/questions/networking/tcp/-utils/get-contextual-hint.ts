import type { TcpPhase } from "./use-tcp-state";

interface TcpGameState {
	phase: TcpPhase;
	splitterVisible: boolean;
	connectionActive: boolean;
	sequenceEnabled: boolean;
	lossScenarioActive: boolean;
	receivedCount: number;
	waitingCount: number;
	connectionClosed: boolean;
}

export const getContextualHint = (state: TcpGameState): string => {
	const {
		phase,
		splitterVisible,
		connectionActive,
		sequenceEnabled,
		lossScenarioActive,
		receivedCount,
		waitingCount,
		connectionClosed,
	} = state;

	if (phase === "mtu") {
		return "Drag message.txt to the Internet to send it.";
	}

	if (phase === "splitter" && splitterVisible) {
		return "The file is too big. Drop it onto the Content Splitter.";
	}

	if (phase === "split-send") {
		return "Send a fragment through the Internet and see how the server responds.";
	}

	if (phase === "syn") {
		return "The server rejected the fragment. Send a SYN to start the handshake.";
	}

	if (phase === "syn-wait") {
		return "SYN sent. Wait for the SYN-ACK response.";
	}

	if (phase === "ack") {
		return "SYN-ACK received. Send an ACK to complete the connection.";
	}

	if (phase === "connected" && !lossScenarioActive) {
		if (waitingCount > 0) {
			return "The server is waiting for the missing packet. Send it next.";
		}
		if (receivedCount === 0) {
			return "Send the numbered packets through the Internet.";
		}
		return "Try sending packets out of order to see them buffered for ordering.";
	}

	if (phase === "notes") {
		return "notes.txt is ready. Drop it onto the Content Splitter.";
	}

	if (phase === "loss") {
		return "Send the notes.txt packets through the Internet. Packet #2 will go missing.";
	}

	if (phase === "resend") {
		return "Duplicate ACKs detected. Resend the missing packet.";
	}

	if (phase === "closing" && !connectionClosed) {
		return "Send FIN to close the connection cleanly.";
	}

	if (phase === "terminal") {
		return "Use `tcpdump` in the terminal to inspect the exchange.";
	}

	if (!connectionActive && sequenceEnabled) {
		return "Connection lost. Re-establish before sending data.";
	}

	return "";
};
