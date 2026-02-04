import { useCallback, useEffect } from "react";
import type { TerminalCommandHelpers } from "@/components/game/engines";
import {
	useGameDispatch,
	useGameEvents,
	useGameState,
} from "@/components/game/game-provider";
import { GOOGLE_IP } from "./constants";
import { buildSuccessModal } from "./modal-builders";

interface UseInternetTerminalArgs {
	pcIp: string | null;
	dnsConfigured: boolean;
	natEnabled: boolean;
	wanConnected: boolean;
	onQuestionComplete: () => void;
}

const SUCCESS_TITLE = "🎉 Connected to the Internet!";
const SUCCESS_MESSAGE = `Congratulations! You've successfully connected your home network to the internet.

You learned how:
- **Router LAN + DHCP** assigns private IPs to your devices
- **Router WAN + PPPoE** authenticates with your ISP to get a public IP
- **Router NAT** translates your private IP to the public IP
- **DNS** resolves domain names (google.com) to IP addresses (142.250.80.46)

Your request traveled: PC → Router LAN → Router NAT → Router WAN → IGW → Internet → Google!`;

export const useInternetTerminal = ({
	pcIp,
	dnsConfigured,
	natEnabled,
	wanConnected,
	onQuestionComplete,
}: UseInternetTerminalArgs) => {
	const dispatch = useGameDispatch();
	const state = useGameState();
	const { events, ack } = useGameEvents();

	useEffect(() => {
		if (events.length === 0) {
			return;
		}

		for (const event of events) {
			if (
				event.type === "MODAL_SUBMITTED" &&
				event.modalId === "success" &&
				event.modalActionId === "primary"
			) {
				onQuestionComplete();
			}
		}

		ack();
	}, [ack, events, onQuestionComplete]);

	const handleCommand = useCallback(
		(input: string, helpers: TerminalCommandHelpers) => {
			if (state.question.status === "completed") return;

			if (state.phase !== "terminal") {
				helpers.writeOutput("Error: Terminal is not ready yet.", "error");
				return;
			}

			const normalized = input.trim();
			const parts = normalized.split(/\s+/);
			const command = parts[0]?.toLowerCase();

			// Handle help command
			if (command === "help") {
				const helpLines = [
					"Terminal - Network diagnostic and testing utility",
					"",
					"----",
					"",
					"SYNOPSIS",
					"ifconfig",
					"nslookup [domain]",
					"curl [destination]",
					"help",
					"",
					"----",
					"",
					"DESCRIPTION",
					"This terminal provides network diagnostic tools to test your",
					"internet connection configuration. Use these commands to verify",
					"IP assignment, DNS resolution, and internet connectivity.",
					"",
					"----",
					"",
					"COMMANDS",
					"ifconfig                    Display network interface configuration",
					"nslookup [domain]           Query DNS to resolve domain names",
					"curl [hostname or IP]       Make HTTP request to test connectivity",
					"help                        Display this help message",
					"",
					"----",
					"",
					"EXAMPLES",
					"ifconfig",
					"nslookup google.com",
					"curl google.com",
					`curl ${GOOGLE_IP}`,
					"",
				];

				for (const line of helpLines) {
					helpers.writeOutput(line, "output");
				}
				return;
			}

			if (command === "ifconfig") {
				if (pcIp) {
					helpers.writeOutput(`eth0: ${pcIp}`, "output");
				} else {
					helpers.writeOutput("eth0: No IP assigned", "output");
				}
				return;
			}

			if (command === "nslookup") {
				if (parts.length < 2) {
					helpers.writeOutput(
						"Error: Missing domain. Usage: nslookup <domain>",
						"error",
					);
					return;
				}

				const domain = parts[1].toLowerCase();

				if (!dnsConfigured) {
					helpers.writeOutput(
						"Error: Could not resolve hostname. DNS server not configured.",
						"error",
					);
					return;
				}

				if (domain === "google.com") {
					helpers.writeOutput(`google.com → ${GOOGLE_IP}`, "output");
				} else {
					helpers.writeOutput(`Error: Unknown host "${parts[1]}".`, "error");
				}
				return;
			}

			if (command === "curl") {
				if (parts.length < 2) {
					helpers.writeOutput(
						"Error: Missing target. Usage: curl <hostname or IP>",
						"error",
					);
					return;
				}

				const target = parts[1].toLowerCase();
				const isDomainTarget = target === "google.com";
				const isIpTarget = target === GOOGLE_IP.toLowerCase();

				if (!isDomainTarget && !isIpTarget) {
					helpers.writeOutput(`Error: Unknown host "${parts[1]}".`, "error");
					return;
				}

				if (!wanConnected) {
					helpers.writeOutput(
						"Error: Network unreachable. No internet connection.",
						"error",
					);
					return;
				}

				if (!natEnabled) {
					helpers.writeOutput(
						"Error: Network unreachable. Check NAT configuration.",
						"error",
					);
					return;
				}

				if (isDomainTarget && !dnsConfigured) {
					helpers.writeOutput(
						"Error: Could not resolve hostname. DNS server not configured.",
						"error",
					);
					return;
				}

				if (isDomainTarget) {
					helpers.writeOutput(
						`Resolving google.com... ${GOOGLE_IP}\nHTTP/1.1 200 OK\n\n<html>...google homepage...</html>`,
						"output",
					);
				} else {
					helpers.writeOutput(
						"HTTP/1.1 200 OK\n\n<html>...google homepage...</html>",
						"output",
					);
				}

				dispatch({
					type: "OPEN_MODAL",
					payload: buildSuccessModal(
						SUCCESS_TITLE,
						SUCCESS_MESSAGE,
						"Next question",
					),
				});

				helpers.finishEngine();
				dispatch({ type: "COMPLETE_QUESTION" });
				return;
			}

			helpers.writeOutput(
				'Error: Unknown command. Type "help" for available commands.',
				"error",
			);
		},
		[
			dispatch,
			pcIp,
			dnsConfigured,
			natEnabled,
			wanConnected,
			state.phase,
			state.question.status,
		],
	);

	return handleCommand;
};
