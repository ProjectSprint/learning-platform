import type { ActiveMode, TcpPhase, UdpPhase } from "./types";

export const getContextualHint = (args: {
	mode: ActiveMode;
	tcpPhase: TcpPhase;
	udpPhase: UdpPhase;
	expectedFrame: number;
	packetsSent: number;
}) => {
	if (args.mode === "udp") {
		switch (args.udpPhase) {
			case "intro":
				return "Drop frames into the Outbox. They'll reach all clients automatically.";
			case "streaming":
				return `Send frames in order: next is Frame ${args.expectedFrame}.`;
			case "complete":
				return "Stream complete!";
			default:
				return null;
		}
	}

	switch (args.tcpPhase) {
		case "handshake-syn":
			return "Drag each SYN packet to the correct client inbox.";
		case "handshake-synack":
			return "Send SYN-ACK responses through the Internet.";
		case "handshake-ack":
			return "Route the final ACK packets to complete connections.";
		case "connected":
			return "Connections established! Now send video packets.";
		case "data-transfer":
			return `Send packets and wait for ACKs. Packets sent: ${args.packetsSent}/18.`;
		case "chaos-new-client":
			return "A new client joined! Complete their handshake.";
		case "chaos-timeout":
			return "Connections timed out! Reconnect the clients.";
		case "chaos-redo":
			return "Redo the handshakes for disconnected clients.";
		case "breaking-point":
			return "This is exhausting...";
		default:
			return null;
	}
};
