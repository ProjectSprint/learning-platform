import type {
	BehaviorDefinition,
	BehaviorRule,
	GameState,
	TerminalInputEvent,
} from "@/components/game/engine/runtime";
import {
	buildEntityClickTrigger,
	buildModalSubmitTrigger,
	buildTerminalInputTrigger,
} from "@/components/game/engine/runtime";
import {
	GOOGLE_IP,
	PUBLIC_DNS_SERVERS,
	VALID_PPPOE_CREDENTIALS,
} from "./constants";
import {
	buildDnsStatusModal,
	buildGoogleStatusModal,
	buildIgwStatusModal,
	buildPcStatusModal,
	buildRouterLanConfigModal,
	buildRouterNatConfigModal,
	buildRouterWanConfigModal,
	buildSuccessModal,
} from "./modal-builders";
import { isPrivateIp, isPublicIp, isValidIp } from "./network-utils";

export type InternetBehaviorContext = {
	navigateAway: boolean;
};

/** Derive internet connectivity status from current game state. */
function deriveStatus(state: GameState) {
	const entities = Object.values(state.entities);
	const routerLan = entities.find((e) => e.type === "router-lan");
	const routerNat = entities.find((e) => e.type === "router-nat");
	const routerWan = entities.find((e) => e.type === "router-wan");

	const lanConfig = routerLan?.data ?? {};
	const dhcpEnabled = lanConfig.dhcpEnabled === true;
	const startIp =
		typeof lanConfig.startIp === "string" ? lanConfig.startIp : null;
	const endIp = typeof lanConfig.endIp === "string" ? lanConfig.endIp : null;
	const dnsServer =
		typeof lanConfig.dnsServer === "string" ? lanConfig.dnsServer : null;

	const hasValidIpRange =
		startIp !== null &&
		endIp !== null &&
		isValidIp(startIp) &&
		isValidIp(endIp) &&
		isPrivateIp(startIp) &&
		isPrivateIp(endIp);
	const hasValidDnsServer =
		dnsServer !== null &&
		isValidIp(dnsServer) &&
		isPublicIp(dnsServer) &&
		PUBLIC_DNS_SERVERS.includes(dnsServer);

	const natEnabled = routerNat?.data?.natEnabled === true;

	const wanConfig = routerWan?.data ?? {};
	const username =
		typeof wanConfig.username === "string" ? wanConfig.username : null;
	const password =
		typeof wanConfig.password === "string" ? wanConfig.password : null;
	const hasValidPppoeCredentials =
		username === VALID_PPPOE_CREDENTIALS.username &&
		password === VALID_PPPOE_CREDENTIALS.password;

	const googleReachable =
		dhcpEnabled &&
		hasValidIpRange &&
		hasValidDnsServer &&
		natEnabled &&
		hasValidPppoeCredentials;

	const pc = entities.find((e) => e.type === "pc");
	const pcIp = typeof pc?.data?.ip === "string" ? pc.data.ip : null;

	return {
		pcIp,
		dnsServer,
		hasValidDnsServer,
		natEnabled,
		hasValidPppoeCredentials,
		wanConnected: hasValidPppoeCredentials,
		googleReachable,
		googleIp: GOOGLE_IP,
	};
}

const rules: BehaviorRule<InternetBehaviorContext>[] = [
	// --- Entity click handlers ---
	{
		id: "internet.router-lan-click",
		on: buildEntityClickTrigger("router-lan"),
		handler: ({ entity, interaction }) => {
			if (!entity) return;
			interaction.openModal(
				buildRouterLanConfigModal(entity.id, entity.data ?? {}),
			);
		},
	},
	{
		id: "internet.router-nat-click",
		on: buildEntityClickTrigger("router-nat"),
		handler: ({ entity, interaction }) => {
			if (!entity) return;
			interaction.openModal(
				buildRouterNatConfigModal(entity.id, entity.data ?? {}),
			);
		},
	},
	{
		id: "internet.router-wan-click",
		on: buildEntityClickTrigger("router-wan"),
		handler: ({ entity, interaction }) => {
			if (!entity) return;
			interaction.openModal(
				buildRouterWanConfigModal(entity.id, entity.data ?? {}),
			);
		},
	},
	{
		id: "internet.pc-click",
		on: buildEntityClickTrigger("pc"),
		handler: ({ entity, state, interaction }) => {
			if (!entity) return;
			const status = deriveStatus(state);
			interaction.openModal(
				buildPcStatusModal(entity.id, {
					ip: typeof entity.data.ip === "string" ? entity.data.ip : undefined,
					status: status.googleReachable
						? "Connected to internet"
						: "Waiting for connection",
				}),
			);
		},
	},
	{
		id: "internet.igw-click",
		on: buildEntityClickTrigger("igw"),
		handler: ({ entity, state, interaction }) => {
			if (!entity) return;
			const status = deriveStatus(state);
			interaction.openModal(
				buildIgwStatusModal(entity.id, {
					status: status.hasValidPppoeCredentials
						? "Authenticated"
						: "Waiting for authentication",
				}),
			);
		},
	},
	{
		id: "internet.dns-click",
		on: buildEntityClickTrigger("dns"),
		handler: ({ entity, state, interaction }) => {
			if (!entity) return;
			const status = deriveStatus(state);
			interaction.openModal(
				buildDnsStatusModal(entity.id, {
					ip: status.dnsServer ?? undefined,
					status: status.hasValidDnsServer ? "Active" : "Unreachable",
				}),
			);
		},
	},
	{
		id: "internet.google-click",
		on: buildEntityClickTrigger("google"),
		handler: ({ entity, state, interaction }) => {
			if (!entity) return;
			const status = deriveStatus(state);
			let reason: string | undefined;
			if (!status.hasValidDnsServer) {
				reason = "DNS not configured";
			} else if (!status.natEnabled) {
				reason = "NAT disabled";
			} else if (!status.hasValidPppoeCredentials) {
				reason = "WAN not connected";
			}
			interaction.openModal(
				buildGoogleStatusModal(entity.id, {
					domain: "google.com",
					ip: status.googleReachable ? status.googleIp : undefined,
					status: status.googleReachable ? "Reachable" : "Unreachable",
					reason,
				}),
			);
		},
	},

	// --- Modal submit save handlers ---
	{
		id: "internet.router-lan-save",
		on: buildModalSubmitTrigger(undefined, "save"),
		guard: ({ event }) =>
			event.type === "MODAL_SUBMITTED" &&
			event.modalId.startsWith("router-lan-config-"),
		handler: ({ event, world }) => {
			if (event.type !== "MODAL_SUBMITTED") return;
			const deviceId = event.modalId.replace("router-lan-config-", "");
			world.updateEntity(deviceId, {
				data: {
					dhcpEnabled: !!event.values.dhcpEnabled,
					startIp: String(event.values.startIp ?? ""),
					endIp: String(event.values.endIp ?? ""),
					dnsServer: String(event.values.dnsServer ?? ""),
				},
			});
		},
	},
	{
		id: "internet.router-nat-save",
		on: buildModalSubmitTrigger(undefined, "save"),
		guard: ({ event }) =>
			event.type === "MODAL_SUBMITTED" &&
			event.modalId.startsWith("router-nat-config-"),
		handler: ({ event, world }) => {
			if (event.type !== "MODAL_SUBMITTED") return;
			const deviceId = event.modalId.replace("router-nat-config-", "");
			world.updateEntity(deviceId, {
				data: { natEnabled: !!event.values.natEnabled },
			});
		},
	},
	{
		id: "internet.router-wan-save",
		on: buildModalSubmitTrigger(undefined, "save"),
		guard: ({ event }) =>
			event.type === "MODAL_SUBMITTED" &&
			event.modalId.startsWith("router-wan-config-"),
		handler: ({ event, world }) => {
			if (event.type !== "MODAL_SUBMITTED") return;
			const deviceId = event.modalId.replace("router-wan-config-", "");
			world.updateEntity(deviceId, {
				data: {
					username: String(event.values.username ?? ""),
					password: String(event.values.password ?? ""),
				},
			});
		},
	},

	// --- Success modal navigation ---
	{
		id: "internet.success-modal-navigate",
		on: buildModalSubmitTrigger("success", "primary"),
		handler: ({ updateContext }) => {
			updateContext((ctx) => {
				ctx.navigateAway = true;
			});
		},
	},

	// --- Terminal commands ---
	{
		id: "internet.terminal-command",
		on: buildTerminalInputTrigger(),
		guard: ({ phase, state }) =>
			phase === "terminal" && state.question.status !== "completed",
		handler: ({ event, state, terminal, interaction, progress }) => {
			const rawInput = (event as TerminalInputEvent).input.trim();
			if (!rawInput) return;

			const parts = rawInput.split(/\s+/);
			const command = parts[0]?.toLowerCase();
			const status = deriveStatus(state);

			if (command === "help") {
				const lines = [
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
				for (const line of lines) {
					terminal.writeOutput(line);
				}
				return;
			}

			if (command === "ifconfig") {
				terminal.writeOutput(
					status.pcIp ? `eth0: ${status.pcIp}` : "eth0: No IP assigned",
				);
				return;
			}

			if (command === "nslookup") {
				if (parts.length < 2) {
					terminal.writeOutput(
						"Error: Missing domain. Usage: nslookup <domain>",
						"error",
					);
					return;
				}
				const domain = parts[1].toLowerCase();
				if (!status.hasValidDnsServer) {
					terminal.writeOutput(
						"Error: Could not resolve hostname. DNS server not configured.",
						"error",
					);
					return;
				}
				if (domain === "google.com") {
					terminal.writeOutput(`google.com → ${GOOGLE_IP}`);
				} else {
					terminal.writeOutput(`Error: Unknown host "${parts[1]}".`, "error");
				}
				return;
			}

			if (command === "curl") {
				if (parts.length < 2) {
					terminal.writeOutput(
						"Error: Missing target. Usage: curl <hostname or IP>",
						"error",
					);
					return;
				}
				const target = parts[1].toLowerCase();
				const isDomainTarget = target === "google.com";
				const isIpTarget = target === GOOGLE_IP.toLowerCase();

				if (!isDomainTarget && !isIpTarget) {
					terminal.writeOutput(`Error: Unknown host "${parts[1]}".`, "error");
					return;
				}
				if (!status.wanConnected) {
					terminal.writeOutput(
						"Error: Network unreachable. No internet connection.",
						"error",
					);
					return;
				}
				if (!status.natEnabled) {
					terminal.writeOutput(
						"Error: Network unreachable. Check NAT configuration.",
						"error",
					);
					return;
				}
				if (isDomainTarget && !status.hasValidDnsServer) {
					terminal.writeOutput(
						"Error: Could not resolve hostname. DNS server not configured.",
						"error",
					);
					return;
				}

				if (isDomainTarget) {
					terminal.writeOutput(
						`Resolving google.com... ${GOOGLE_IP}\nHTTP/1.1 200 OK\n\n<html>...google homepage...</html>`,
					);
				} else {
					terminal.writeOutput(
						"HTTP/1.1 200 OK\n\n<html>...google homepage...</html>",
					);
				}

				const successTitle = "Connected to the Internet!";
				const successMessage = `Congratulations! You've successfully connected your home network to the internet.\n\nYou learned how:\n- **Router LAN + DHCP** assigns private IPs to your devices\n- **Router WAN + PPPoE** authenticates with your ISP to get a public IP\n- **Router NAT** translates your private IP to the public IP\n- **DNS** resolves domain names (google.com) to IP addresses (${GOOGLE_IP})\n\nYour request traveled: PC → Router LAN → Router NAT → Router WAN → IGW → Internet → Google!`;
				interaction.openModal(
					buildSuccessModal(successTitle, successMessage, "Next question"),
				);
				terminal.finishEngine();
				progress.completeQuestion();
				return;
			}

			terminal.writeOutput(
				'Error: Unknown command. Type "help" for available commands.',
				"error",
			);
		},
	},
	{
		id: "internet.terminal-not-ready",
		on: buildTerminalInputTrigger(),
		guard: ({ phase }) => phase !== "terminal",
		handler: ({ terminal }) => {
			terminal.writeOutput("Error: Terminal is not ready yet.", "error");
		},
	},
];

export const INTERNET_BEHAVIORS: BehaviorDefinition<InternetBehaviorContext> = {
	initialContext: { navigateAway: false },
	rules,
};
