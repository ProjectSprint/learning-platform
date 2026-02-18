import {
	buildEntityClickTrigger,
	buildModalSubmitTrigger,
	buildTerminalInputTrigger,
	createEntityPayloadWriter,
	type ModalSubmissionContract,
	parseModalSubmission,
	parseTerminalInput,
	type TerminalInputContract,
} from "@/components/game/engine/runtime";
import type {
	BehaviorDefinitionFor,
	BehaviorRuleFor,
} from "@/components/game/types/behavior";
import type { DhcpSpaceKey } from "./constants";
import {
	buildPcConfigModal,
	buildRouterConfigModal,
	buildSuccessModal,
} from "./modal-builders";

type DhcpBehaviorContext = {
	lastConfiguredDeviceId: string | null;
	navigateAway: boolean;
};

export type DhcpPhase = "setup" | "playing" | "terminal" | "completed";
export type DhcpEntityType = "pc" | "router" | "cable";
export type DhcpSpaceId = DhcpSpaceKey | "inventory";
type DhcpModalId = string;
type DhcpModalActionId = "save" | "primary";

type DhcpTriggerSpec = {
	spaceId: DhcpSpaceId;
	entityType: DhcpEntityType;
	modalId: DhcpModalId;
	modalActionId: DhcpModalActionId;
	phase: DhcpPhase;
};

type RouterConfigSubmission = {
	deviceId: string;
	dhcpEnabled: boolean;
	startIp: string;
	endIp: string;
};

type DhcpEntityDataByType = {
	router: {
		dhcpEnabled: boolean;
		startIp: string;
		endIp: string;
	};
};

type DhcpTerminalCommand =
	| { kind: "help" }
	| { kind: "ping"; target: string }
	| { kind: "unknown"; raw: string };

const DHCP_TERMINAL_COMMAND_CONTRACT: TerminalInputContract<DhcpTerminalCommand> =
	{
		parse: (input) => {
			const normalized = input.trim().toLowerCase();
			if (!normalized) {
				return { ok: false, errors: ["empty command"] };
			}

			const parts = normalized.split(/\s+/);
			const command = parts[0];

			if (command === "help") {
				return { ok: true, value: { kind: "help" } };
			}

			if (command === "ping") {
				const target = parts[1];
				if (!target) {
					return { ok: false, errors: ["ping target missing"] };
				}
				return { ok: true, value: { kind: "ping", target } };
			}

			return { ok: true, value: { kind: "unknown", raw: normalized } };
		},
	};

const ROUTER_CONFIG_SAVE_CONTRACT: ModalSubmissionContract<RouterConfigSubmission> =
	{
		actionId: "save",
		modalIdStartsWith: "router-config-",
		parse: (values, event) => {
			const deviceId = event.modalId.replace("router-config-", "");
			if (!deviceId) {
				return {
					ok: false,
					errors: ["router config modal must include device id"],
				};
			}
			return {
				ok: true,
				value: {
					deviceId,
					dhcpEnabled: values.dhcpEnabled === true,
					startIp: String(values.startIp ?? ""),
					endIp: String(values.endIp ?? ""),
				},
			};
		},
	};

const SUCCESS_NAVIGATION_CONTRACT: ModalSubmissionContract<null> = {
	actionId: "primary",
	modalId: "success",
	parse: () => ({ ok: true, value: null }),
};

const rules: BehaviorRuleFor<DhcpBehaviorContext, DhcpTriggerSpec>[] = [
	{
		id: "dhcp.router-click",
		on: buildEntityClickTrigger("router"),
		handler: ({ entity, interaction }) => {
			if (!entity) return;
			interaction.openModal(
				buildRouterConfigModal(entity.id, entity.data ?? {}),
			);
		},
	},
	{
		id: "dhcp.pc-click",
		on: buildEntityClickTrigger("pc"),
		handler: ({ entity, state, interaction }) => {
			if (!entity) return;
			const currentData = {
				...entity.data,
				ip: state.entities[entity.id]?.state.ip ?? entity.data.ip,
			};
			interaction.openModal(buildPcConfigModal(entity.id, currentData));
		},
	},
	{
		id: "dhcp.router-config-save",
		on: buildModalSubmitTrigger<`router-config-${string}`, "save">(
			undefined,
			"save",
		),
		handler: ({ event, world, updateContext }) => {
			const parsed = parseModalSubmission(event, ROUTER_CONFIG_SAVE_CONTRACT);
			if (!parsed || !parsed.ok) {
				return;
			}

			const { deviceId, dhcpEnabled, startIp, endIp } = parsed.value;
			const payloadWriter = createEntityPayloadWriter<
				DhcpEntityDataByType,
				Record<string, never>
			>(world);

			payloadWriter.updateData(deviceId, "router", {
				dhcpEnabled,
				startIp,
				endIp,
			});

			updateContext((ctx) => {
				ctx.lastConfiguredDeviceId = deviceId;
			});
		},
	},
	{
		id: "dhcp.success-modal-navigate",
		on: buildModalSubmitTrigger("success", "primary"),
		handler: ({ event, updateContext }) => {
			const parsed = parseModalSubmission(event, SUCCESS_NAVIGATION_CONTRACT);
			if (!parsed || !parsed.ok) {
				return;
			}
			updateContext((ctx) => {
				ctx.navigateAway = true;
			});
		},
	},
	{
		id: "dhcp.terminal-onboarding",
		on: { event: "PHASE_CHANGED", to: "terminal" },
		handler: ({ state, schedule, once }) => {
			once("dhcp.terminal.onboarding", () => {
				schedule(
					"dhcp.terminal.onboarding.delay",
					100,
					({ terminal: sTerm }) => {
						const rawPc2Ip = state.entities["pc-2"]?.state.ip;
						const pc2Ip = typeof rawPc2Ip === "string" ? rawPc2Ip : null;
						const lines = [
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
						for (const line of lines) {
							sTerm.writeOutput(line);
						}
					},
				);
			});
		},
	},
	{
		id: "dhcp.terminal-command",
		on: buildTerminalInputTrigger(),
		guard: ({ phase, state }) =>
			phase === "terminal" && state.question.status !== "completed",
		handler: ({ event, state, terminal, interaction, progress }) => {
			const parsed = parseTerminalInput(event, DHCP_TERMINAL_COMMAND_CONTRACT);
			if (!parsed || !parsed.ok) {
				return;
			}

			const command = parsed.value;

			if (command.kind === "help") {
				const rawPc2Ip = state.entities["pc-2"]?.state.ip;
				const pc2Ip = typeof rawPc2Ip === "string" ? rawPc2Ip : null;
				const lines = [
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
				for (const line of lines) {
					terminal.writeOutput(line);
				}
				return;
			}

			if (command.kind === "unknown") {
				terminal.writeOutput(
					'Error: Unknown command. Type "help" for available commands.',
					"error",
				);
				return;
			}

			const target = command.target;
			const rawPc2Ip = state.entities["pc-2"]?.state.ip;
			const pc2Ip = typeof rawPc2Ip === "string" ? rawPc2Ip : null;

			if (pc2Ip && target === pc2Ip) {
				terminal.writeOutput(`Reply from ${pc2Ip}: bytes=32 time<1ms TTL=64`);
				interaction.openModal(
					buildSuccessModal(
						"Question complete",
						"You connected two computers and verified their connection using ping.",
						"Next question",
					),
				);
				terminal.finishEngine();
				progress.completeQuestion();
				return;
			}

			terminal.writeOutput(`Error: Unknown target "${target}".`, "error");
		},
	},
	{
		id: "dhcp.terminal-not-ready",
		on: buildTerminalInputTrigger(),
		guard: ({ phase }) => phase !== "terminal",
		handler: ({ terminal }) => {
			terminal.writeOutput("Error: Terminal is not ready yet.", "error");
		},
	},
];

export type { DhcpBehaviorContext };

export const DHCP_BEHAVIORS: BehaviorDefinitionFor<
	DhcpBehaviorContext,
	DhcpTriggerSpec
> = {
	initialContext: { lastConfiguredDeviceId: null, navigateAway: false },
	rules,
};
