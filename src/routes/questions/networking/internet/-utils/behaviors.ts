import {
	BehaviorDefinition,
	BehaviorRule,
	buildEntityClickTrigger,
	buildModalSubmitTrigger,
	buildTerminalInputTrigger,
	createEntityPayloadWriter,
	type ModalSubmissionContract,
	parseModalSubmission,
	parseTerminalInput,
	selectEntitiesByType,
	type TerminalInputContract,
} from "@/components/game/engine/runtime";
import type { GameState } from "@/components/game/types/state";
import {
	GOOGLE_IP,
	type InternetSpaceKey,
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

export type InternetPhase =
	| "setup"
	| "playing"
	| "configuring"
	| "terminal"
	| "completed";
export type InternetSpaceId = InternetSpaceKey | "inventory";
export type InternetEntityType =
	| "cable"
	| "fiber"
	| "pc"
	| "router-lan"
	| "router-nat"
	| "router-wan"
	| "igw"
	| "dns"
	| "google";
type InternetModalId = string;
type InternetModalActionId = "save" | "primary";

type InternetTriggerSpec = {
	spaceId: InternetSpaceId;
	entityType: InternetEntityType;
	modalId: InternetModalId;
	modalActionId: InternetModalActionId;
	phase: InternetPhase;
};

type RouterLanConfigSubmission = {
	deviceId: string;
	dhcpEnabled: boolean;
	startIp: string;
	endIp: string;
	dnsServer: string;
};

type RouterNatConfigSubmission = {
	deviceId: string;
	natEnabled: boolean;
};

type RouterWanConfigSubmission = {
	deviceId: string;
	connectionType: "PPPoE";
	username: string;
	password: string;
};

type InternetEntityDataByType = {
	"router-lan": {
		dhcpEnabled: boolean;
		startIp: string;
		endIp: string;
		dnsServer: string;
	};
	"router-nat": {
		natEnabled: boolean;
	};
	"router-wan": {
		connectionType: "PPPoE";
		username: string;
		password: string;
	};
};

type InternetTerminalCommand =
	| { kind: "help" }
	| { kind: "ifconfig" }
	| { kind: "nslookup"; domain?: string; rawDomain?: string }
	| { kind: "curl"; target?: string; rawTarget?: string }
	| { kind: "unknown" };

const INTERNET_TERMINAL_COMMAND_CONTRACT: TerminalInputContract<InternetTerminalCommand> =
	{
		parse: (input) => {
			const raw = input.trim();
			if (!raw) {
				return { ok: false, errors: ["empty command"] };
			}

			const parts = raw.split(/\s+/);
			const command = parts[0]?.toLowerCase();
			switch (command) {
				case "help":
					return { ok: true, value: { kind: "help" } };
				case "ifconfig":
					return { ok: true, value: { kind: "ifconfig" } };
				case "nslookup":
					return {
						ok: true,
						value: {
							kind: "nslookup",
							domain: parts[1]?.toLowerCase(),
							rawDomain: parts[1],
						},
					};
				case "curl":
					return {
						ok: true,
						value: {
							kind: "curl",
							target: parts[1]?.toLowerCase(),
							rawTarget: parts[1],
						},
					};
				default:
					return { ok: true, value: { kind: "unknown" } };
			}
		},
	};

const ROUTER_LAN_SAVE_CONTRACT: ModalSubmissionContract<RouterLanConfigSubmission> =
	{
		actionId: "save",
		modalIdStartsWith: "router-lan-config-",
		parse: (values, event) => {
			const deviceId = event.modalId.replace("router-lan-config-", "");
			if (!deviceId) {
				return {
					ok: false,
					errors: ["router lan modal must include device id"],
				};
			}
			return {
				ok: true,
				value: {
					deviceId,
					dhcpEnabled: values.dhcpEnabled === true,
					startIp: String(values.startIp ?? ""),
					endIp: String(values.endIp ?? ""),
					dnsServer: String(values.dnsServer ?? ""),
				},
			};
		},
	};

const ROUTER_NAT_SAVE_CONTRACT: ModalSubmissionContract<RouterNatConfigSubmission> =
	{
		actionId: "save",
		modalIdStartsWith: "router-nat-config-",
		parse: (values, event) => {
			const deviceId = event.modalId.replace("router-nat-config-", "");
			if (!deviceId) {
				return {
					ok: false,
					errors: ["router nat modal must include device id"],
				};
			}
			return {
				ok: true,
				value: { deviceId, natEnabled: values.natEnabled === true },
			};
		},
	};

const ROUTER_WAN_SAVE_CONTRACT: ModalSubmissionContract<RouterWanConfigSubmission> =
	{
		actionId: "save",
		modalIdStartsWith: "router-wan-config-",
		parse: (values, event) => {
			const deviceId = event.modalId.replace("router-wan-config-", "");
			if (!deviceId) {
				return {
					ok: false,
					errors: ["router wan modal must include device id"],
				};
			}
			return {
				ok: true,
				value: {
					deviceId,
					connectionType: "PPPoE",
					username: String(values.username ?? ""),
					password: String(values.password ?? ""),
				},
			};
		},
	};

const INTERNET_SUCCESS_NAVIGATION_CONTRACT: ModalSubmissionContract<null> = {
	actionId: "primary",
	modalId: "success",
	parse: () => ({ ok: true, value: null }),
};

/** Derive internet connectivity status from current game state. */
function deriveStatus(snapshot: GameState) {
	const routerLan = selectEntitiesByType(snapshot, "router-lan")[0];
	const routerNat = selectEntitiesByType(snapshot, "router-nat")[0];
	const routerWan = selectEntitiesByType(snapshot, "router-wan")[0];

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

	const pc = selectEntitiesByType(snapshot, "pc")[0];
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

const rules = [
	// --- Entity click handlers ---
	BehaviorRule<InternetBehaviorContext, InternetTriggerSpec>({
		id: "internet.router-lan-click",
		on: buildEntityClickTrigger("router-lan"),
		handler: ({ entity, cmd }) => {
			if (!entity) return;
			cmd.openModal(buildRouterLanConfigModal(entity.id, entity.data ?? {}));
		},
	}),
	BehaviorRule<InternetBehaviorContext, InternetTriggerSpec>({
		id: "internet.router-nat-click",
		on: buildEntityClickTrigger("router-nat"),
		handler: ({ entity, cmd }) => {
			if (!entity) return;
			cmd.openModal(buildRouterNatConfigModal(entity.id, entity.data ?? {}));
		},
	}),
	BehaviorRule<InternetBehaviorContext, InternetTriggerSpec>({
		id: "internet.router-wan-click",
		on: buildEntityClickTrigger("router-wan"),
		handler: ({ entity, cmd }) => {
			if (!entity) return;
			cmd.openModal(buildRouterWanConfigModal(entity.id, entity.data ?? {}));
		},
	}),
	BehaviorRule<InternetBehaviorContext, InternetTriggerSpec>({
		id: "internet.pc-click",
		on: buildEntityClickTrigger("pc"),
		handler: ({ entity, snapshot, cmd }) => {
			if (!entity) return;
			const status = deriveStatus(snapshot);
			cmd.openModal(
				buildPcStatusModal(entity.id, {
					ip: typeof entity.data.ip === "string" ? entity.data.ip : undefined,
					status: status.googleReachable
						? "Connected to internet"
						: "Waiting for connection",
				}),
			);
		},
	}),
	BehaviorRule<InternetBehaviorContext, InternetTriggerSpec>({
		id: "internet.igw-click",
		on: buildEntityClickTrigger("igw"),
		handler: ({ entity, snapshot, cmd }) => {
			if (!entity) return;
			const status = deriveStatus(snapshot);
			cmd.openModal(
				buildIgwStatusModal(entity.id, {
					status: status.hasValidPppoeCredentials
						? "Authenticated"
						: "Waiting for authentication",
				}),
			);
		},
	}),
	BehaviorRule<InternetBehaviorContext, InternetTriggerSpec>({
		id: "internet.dns-click",
		on: buildEntityClickTrigger("dns"),
		handler: ({ entity, snapshot, cmd }) => {
			if (!entity) return;
			const status = deriveStatus(snapshot);
			cmd.openModal(
				buildDnsStatusModal(entity.id, {
					ip: status.dnsServer ?? undefined,
					status: status.hasValidDnsServer ? "Active" : "Unreachable",
				}),
			);
		},
	}),
	BehaviorRule<InternetBehaviorContext, InternetTriggerSpec>({
		id: "internet.google-click",
		on: buildEntityClickTrigger("google"),
		handler: ({ entity, snapshot, cmd }) => {
			if (!entity) return;
			const status = deriveStatus(snapshot);
			let reason: string | undefined;
			if (!status.hasValidDnsServer) {
				reason = "DNS not configured";
			} else if (!status.natEnabled) {
				reason = "NAT disabled";
			} else if (!status.hasValidPppoeCredentials) {
				reason = "WAN not connected";
			}
			cmd.openModal(
				buildGoogleStatusModal(entity.id, {
					domain: "google.com",
					ip: status.googleReachable ? status.googleIp : undefined,
					status: status.googleReachable ? "Reachable" : "Unreachable",
					reason,
				}),
			);
		},
	}),

	// --- Modal submit save handlers ---
	BehaviorRule<InternetBehaviorContext, InternetTriggerSpec>({
		id: "internet.router-lan-save",
		on: buildModalSubmitTrigger(undefined, "save"),
		guard: ({ event }) =>
			event.type === "MODAL_SUBMITTED" &&
			event.modalId.startsWith("router-lan-config-"),
		handler: ({ event, cmd }) => {
			const parsed = parseModalSubmission(event, ROUTER_LAN_SAVE_CONTRACT);
			if (!parsed || !parsed.ok) {
				return;
			}
			const { deviceId, dhcpEnabled, startIp, endIp, dnsServer } = parsed.value;
			const payloadWriter = createEntityPayloadWriter<
				InternetEntityDataByType,
				Record<string, never>
			>(cmd);
			payloadWriter.updateData(deviceId, "router-lan", {
				dhcpEnabled,
				startIp,
				endIp,
				dnsServer,
			});
		},
	}),
	BehaviorRule<InternetBehaviorContext, InternetTriggerSpec>({
		id: "internet.router-nat-save",
		on: buildModalSubmitTrigger(undefined, "save"),
		guard: ({ event }) =>
			event.type === "MODAL_SUBMITTED" &&
			event.modalId.startsWith("router-nat-config-"),
		handler: ({ event, cmd }) => {
			const parsed = parseModalSubmission(event, ROUTER_NAT_SAVE_CONTRACT);
			if (!parsed || !parsed.ok) {
				return;
			}
			const { deviceId, natEnabled } = parsed.value;
			const payloadWriter = createEntityPayloadWriter<
				InternetEntityDataByType,
				Record<string, never>
			>(cmd);
			payloadWriter.updateData(deviceId, "router-nat", {
				natEnabled,
			});
		},
	}),
	BehaviorRule<InternetBehaviorContext, InternetTriggerSpec>({
		id: "internet.router-wan-save",
		on: buildModalSubmitTrigger(undefined, "save"),
		guard: ({ event }) =>
			event.type === "MODAL_SUBMITTED" &&
			event.modalId.startsWith("router-wan-config-"),
		handler: ({ event, cmd }) => {
			const parsed = parseModalSubmission(event, ROUTER_WAN_SAVE_CONTRACT);
			if (!parsed || !parsed.ok) {
				return;
			}
			const { deviceId, connectionType, username, password } = parsed.value;
			const payloadWriter = createEntityPayloadWriter<
				InternetEntityDataByType,
				Record<string, never>
			>(cmd);
			payloadWriter.updateData(deviceId, "router-wan", {
				connectionType,
				username,
				password,
			});
		},
	}),

	// --- Success modal navigation ---
	BehaviorRule<InternetBehaviorContext, InternetTriggerSpec>({
		id: "internet.success-modal-navigate",
		on: buildModalSubmitTrigger("success", "primary"),
		handler: ({ event, mutate }) => {
			const parsed = parseModalSubmission(
				event,
				INTERNET_SUCCESS_NAVIGATION_CONTRACT,
			);
			if (!parsed || !parsed.ok) {
				return;
			}
			mutate((ctx) => {
				ctx.navigateAway = true;
			});
		},
	}),
	BehaviorRule<InternetBehaviorContext, InternetTriggerSpec>({
		id: "internet.terminal-onboarding",
		on: { event: "PHASE_CHANGED", to: "terminal" },
		handler: ({ schedule, once }) => {
			once("internet.terminal.onboarding", () => {
				schedule("internet.terminal.onboarding.delay", 100, ({ cmd }) => {
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
					for (const line of lines) {
						cmd.terminal.write(line);
					}
				});
			});
		},
	}),

	// --- Terminal commands ---
	BehaviorRule<InternetBehaviorContext, InternetTriggerSpec>({
		id: "internet.terminal-command",
		on: buildTerminalInputTrigger(),
		guard: ({ phase, snapshot }) =>
			phase === "terminal" && snapshot.question.status !== "completed",
		handler: ({ event, snapshot, cmd }) => {
			const parsed = parseTerminalInput(
				event,
				INTERNET_TERMINAL_COMMAND_CONTRACT,
			);
			if (!parsed || !parsed.ok) {
				return;
			}

			const command = parsed.value;
			const status = deriveStatus(snapshot);

			if (command.kind === "help") {
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
					cmd.terminal.write(line);
				}
				return;
			}

			if (command.kind === "ifconfig") {
				cmd.terminal.write(
					status.pcIp ? `eth0: ${status.pcIp}` : "eth0: No IP assigned",
				);
				return;
			}

			if (command.kind === "nslookup") {
				if (!command.domain) {
					cmd.terminal.write(
						"Error: Missing domain. Usage: nslookup <domain>",
						"error",
					);
					return;
				}
				const domain = command.domain;
				if (!status.hasValidDnsServer) {
					cmd.terminal.write(
						"Error: Could not resolve hostname. DNS server not configured.",
						"error",
					);
					return;
				}
				if (domain === "google.com") {
					cmd.terminal.write(`google.com → ${GOOGLE_IP}`);
				} else {
					cmd.terminal.write(
						`Error: Unknown host "${command.rawDomain ?? domain}".`,
						"error",
					);
				}
				return;
			}

			if (command.kind === "curl") {
				if (!command.target) {
					cmd.terminal.write(
						"Error: Missing target. Usage: curl <hostname or IP>",
						"error",
					);
					return;
				}
				const target = command.target;
				const isDomainTarget = target === "google.com";
				const isIpTarget = target === GOOGLE_IP.toLowerCase();

				if (!isDomainTarget && !isIpTarget) {
					cmd.terminal.write(
						`Error: Unknown host "${command.rawTarget ?? target}".`,
						"error",
					);
					return;
				}
				if (!status.wanConnected) {
					cmd.terminal.write(
						"Error: Network unreachable. No internet connection.",
						"error",
					);
					return;
				}
				if (!status.natEnabled) {
					cmd.terminal.write(
						"Error: Network unreachable. Check NAT configuration.",
						"error",
					);
					return;
				}
				if (isDomainTarget && !status.hasValidDnsServer) {
					cmd.terminal.write(
						"Error: Could not resolve hostname. DNS server not configured.",
						"error",
					);
					return;
				}

				if (isDomainTarget) {
					cmd.terminal.write(
						`Resolving google.com... ${GOOGLE_IP}\nHTTP/1.1 200 OK\n\n<html>...google homepage...</html>`,
					);
				} else {
					cmd.terminal.write(
						"HTTP/1.1 200 OK\n\n<html>...google homepage...</html>",
					);
				}

				const successTitle = "Connected to the Internet!";
				const successMessage = `Congratulations! You've successfully connected your home network to the internet.\n\nYou learned how:\n- **Router LAN + DHCP** assigns private IPs to your devices\n- **Router WAN + PPPoE** authenticates with your ISP to get a public IP\n- **Router NAT** translates your private IP to the public IP\n- **DNS** resolves domain names (google.com) to IP addresses (${GOOGLE_IP})\n\nYour request traveled: PC → Router LAN → Router NAT → Router WAN → IGW → Internet → Google!`;
				cmd.openModal(
					buildSuccessModal(successTitle, successMessage, "Next question"),
				);
				cmd.terminal.finish();
				cmd.completeQuestion();
				return;
			}

			cmd.terminal.write(
				'Error: Unknown command. Type "help" for available commands.',
				"error",
			);
		},
	}),
	BehaviorRule<InternetBehaviorContext, InternetTriggerSpec>({
		id: "internet.terminal-not-ready",
		on: buildTerminalInputTrigger(),
		guard: ({ phase }) => phase !== "terminal",
		handler: ({ cmd }) => {
			cmd.terminal.write("Error: Terminal is not ready yet.", "error");
		},
	}),
];

export const INTERNET_BEHAVIORS = BehaviorDefinition<
	InternetBehaviorContext,
	InternetTriggerSpec
>({
	initialContext: { navigateAway: false },
	rules,
});
