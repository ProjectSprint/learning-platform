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
				return "Switching to UDP streaming...";
			case "unicast":
				return "Drag each client's unicast response to Received to confirm they're listening.";
			case "streaming":
				return `Send frames in order: next is Frame ${args.expectedFrame}.`;
			case "complete":
				return "Stream complete!";
			default:
				return null;
		}
	}

	switch (args.tcpPhase) {
		case "handshake-synack":
			return "Send SYN-ACK packets for each active client.";
		case "connected":
			return "Connections established. Continue to data transfer.";
		case "data-transfer":
			return `Send packets and wait for ACKs. Packets sent: ${args.packetsSent}/18.`;
		case "chaos-new-client":
			return "Client D joined. Complete handshake for D.";
		case "chaos-timeout":
			return "Connections timed out! Reconnect the clients.";
		case "chaos-redo":
			return "Reconnect A/B/C, then resend to reach breaking point.";
		case "breaking-point":
			return "This is exhausting...";
		default:
			return null;
	}
};
