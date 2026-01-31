import { useCallback } from "react";
import type { TerminalCommandHelpers } from "@/components/game/engines";
import { useGameDispatch, useGameState } from "@/components/game/game-provider";
import { buildSuccessModal } from "./modal-builders";

interface UseTcpTerminalArgs {
	onQuestionComplete?: VoidFunction;
}

const NETSTAT_OUTPUT = `Active Connections

Proto  Local Address      Foreign Address    State
TCP    192.168.1.10:54321 93.184.216.34:80  ESTABLISHED`;

const TCPDUMP_OUTPUT = `15:04:32.001 IP 192.168.1.10 > 93.184.216.34: Flags [S], seq 1000
15:04:32.045 IP 93.184.216.34 > 192.168.1.10: Flags [S.], seq 2000, ack 1001
15:04:32.046 IP 192.168.1.10 > 93.184.216.34: Flags [.], ack 2001

15:04:32.100 IP 192.168.1.10 > 93.184.216.34: Flags [P.], seq 1001:1101, ack 2001
15:04:32.150 IP 93.184.216.34 > 192.168.1.10: Flags [.], ack 1101

15:04:32.200 IP 192.168.1.10 > 93.184.216.34: Flags [P.], seq 1101:1201, ack 2001
15:04:32.205 IP 93.184.216.34 > 192.168.1.10: Flags [.], ack 1101 (dup)
15:04:32.255 IP 93.184.216.34 > 192.168.1.10: Flags [.], ack 1101 (dup)
15:04:32.305 IP 93.184.216.34 > 192.168.1.10: Flags [.], ack 1101 (dup)

15:04:32.400 IP 192.168.1.10 > 93.184.216.34: Flags [P.], seq 1101:1201, ack 2001 (retransmission)
15:04:32.450 IP 93.184.216.34 > 192.168.1.10: Flags [.], ack 1201

15:04:32.500 IP 192.168.1.10 > 93.184.216.34: Flags [P.], seq 1201:1301, ack 2001
15:04:32.550 IP 93.184.216.34 > 192.168.1.10: Flags [.], ack 1301

15:04:33.000 IP 192.168.1.10 > 93.184.216.34: Flags [F.], seq 1301, ack 2001
15:04:33.050 IP 93.184.216.34 > 192.168.1.10: Flags [F.], seq 2001, ack 1302
15:04:33.051 IP 192.168.1.10 > 93.184.216.34: Flags [.], ack 2002

--- Connection closed gracefully ---`;

const TCPDUMP_EXPLAIN_OUTPUT = `TCP Flags explained:
  [S]  = SYN      - Start connection
  [S.] = SYN-ACK  - Acknowledge + start
  [.]  = ACK      - Acknowledgment
  [P.] = PSH-ACK  - Push data + ack
  [F.] = FIN-ACK  - Finish + ack

Your session:
  1. Three-way handshake (SYN -> SYN-ACK -> ACK)
  2. Data transfer (3 packets, loss + retransmission)
  3. Connection close (FIN -> FIN-ACK -> ACK)

Total packets: 16
Retransmissions: 1
Packet loss: 1`;

const SS_OUTPUT = `State  Recv-Q Send-Q Local Address:Port Peer Address:Port
ESTAB  0      0      192.168.1.10:54321 93.184.216.34:80`;

const HELP_OUTPUT = `Supported commands:
- netstat
- netstat -an
- tcpdump
- tcpdump -explain
- tcpdump -count
- ss -t
- help
- clear`;

export const useTcpTerminal = ({ onQuestionComplete }: UseTcpTerminalArgs) => {
	const dispatch = useGameDispatch();
	const state = useGameState();

	return useCallback(
		(input: string, helpers: TerminalCommandHelpers) => {
			if (state.question.status === "completed") return;

			if (state.phase !== "terminal") {
				helpers.writeOutput("Error: Terminal is not ready yet.", "error");
				return;
			}

			const normalized = input.trim();
			if (!normalized) return;

			const parts = normalized.split(/\s+/);
			const command = parts[0]?.toLowerCase();
			const arg = parts.slice(1).join(" ").toLowerCase();

			switch (command) {
				case "help":
					helpers.writeOutput(HELP_OUTPUT, "output");
					return;
				case "clear":
					helpers.clearHistory();
					return;
				case "netstat":
					if (arg === "-an") {
						helpers.writeOutput(NETSTAT_OUTPUT, "output");
						return;
					}
					helpers.writeOutput(NETSTAT_OUTPUT, "output");
					return;
				case "tcpdump": {
					let shouldComplete = false;
					if (arg === "-explain") {
						helpers.writeOutput(TCPDUMP_EXPLAIN_OUTPUT, "output");
						shouldComplete = true;
					} else if (arg === "-count") {
						helpers.writeOutput(
							"Total packets: 16\nRetransmissions: 1\nPacket loss: 1",
							"output",
						);
					} else if (!arg) {
						helpers.writeOutput(TCPDUMP_OUTPUT, "output");
						shouldComplete = true;
					} else {
						helpers.writeOutput(
							"Unknown tcpdump option. Try tcpdump -explain",
							"error",
						);
						return;
					}

					if (shouldComplete) {
						dispatch({
							type: "OPEN_MODAL",
							payload: buildSuccessModal(onQuestionComplete),
						});
						helpers.finishEngine();
						dispatch({ type: "COMPLETE_QUESTION" });
					}
					return;
				}
				case "ss":
					if (arg === "-t") {
						helpers.writeOutput(SS_OUTPUT, "output");
						return;
					}
					helpers.writeOutput("Usage: ss -t", "output");
					return;
				default:
					helpers.writeOutput(
						`Unknown command: ${normalized}. Type 'help' for available commands.`,
						"error",
					);
			}
		},
		[dispatch, onQuestionComplete, state.phase, state.question.status],
	);
};
