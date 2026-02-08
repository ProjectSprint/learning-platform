import { useCallback } from "react";
import type { TerminalCommandHelpers } from "@/components/game/engines";
import { useGameState } from "@/components/game/game-provider";
import type {
	InteractionSessionApi,
	ProgressApi,
} from "@/components/game/runtime";
import { buildSuccessModal } from "./modal-builders";

interface UseNetworkingTerminalArgs {
	pc2Ip: string | null;
	interactionSession: InteractionSessionApi;
	progress: ProgressApi;
}

export const useNetworkingTerminal = ({
	pc2Ip,
	interactionSession,
	progress,
}: UseNetworkingTerminalArgs) => {
	const state = useGameState();

	const handleCommand = useCallback(
		(input: string, helpers: TerminalCommandHelpers) => {
			if (state.question.status === "completed") return;

			if (state.phase !== "terminal") {
				helpers.writeOutput("Error: Terminal is not ready yet.", "error");
				return;
			}

			const normalized = input.trim().toLowerCase();
			const parts = normalized.split(/\s+/);

			// Handle help command
			if (parts[0] === "help") {
				const helpLines = [
					"Terminal - Network diagnostic utility",
					"",
					"----",
					"",
					"SYNOPSIS",
					"ping [destination]",
					"help",
					"",
					"----",
					"",
					"DESCRIPTION",
					"The ping utility sends ICMP ECHO_REQUEST packets to network hosts",
					"to test connectivity and measure round-trip time.",
					"",
					"----",
					"",
					"COMMANDS",
					"ping [ip]       Send ICMP echo request to specified IP address",
					"help            Display this help message",
					"",
					"----",
					"",
					"EXAMPLES",
					pc2Ip ? `ping ${pc2Ip}` : "ping 192.168.1.10",
					"",
				];

				for (const line of helpLines) {
					helpers.writeOutput(line, "output");
				}
				return;
			}

			if (parts[0] !== "ping") {
				helpers.writeOutput(
					'Error: Unknown command. Type "help" for available commands.',
					"error",
				);
				return;
			}

			if (parts.length < 2) {
				helpers.writeOutput("Error: Missing target.", "error");
				return;
			}

			const target = parts[1];
			const isValidTarget = pc2Ip && target === pc2Ip;

			if (isValidTarget && pc2Ip) {
				helpers.writeOutput(
					`Reply from ${pc2Ip}: bytes=32 time<1ms TTL=64`,
					"output",
				);

				interactionSession.openModal(
					buildSuccessModal(
						"Question complete",
						"You connected two computers and verified their connection using ping.",
						"Next question",
					),
				);

				helpers.finishEngine();
				progress.completeQuestion();
				return;
			}

			helpers.writeOutput(`Error: Unknown target "${target}".`, "error");
		},
		[interactionSession, pc2Ip, progress, state.phase, state.question.status],
	);

	return handleCommand;
};
