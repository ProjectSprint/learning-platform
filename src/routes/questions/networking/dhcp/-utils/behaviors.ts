import type {
	BehaviorDefinition,
	BehaviorRule,
	TerminalInputEvent,
} from "@/components/game/engine/runtime";
import {
	entityClicked,
	modalSubmitted,
	terminalInput,
} from "@/components/game/engine/runtime";
import {
	buildPcConfigModal,
	buildRouterConfigModal,
	buildSuccessModal,
} from "./modal-builders";

type DhcpBehaviorContext = {
	lastConfiguredDeviceId: string | null;
	navigateAway: boolean;
};

const rules: BehaviorRule<DhcpBehaviorContext>[] = [
	{
		id: "dhcp.router-click",
		on: entityClicked("router"),
		handler: ({ entity, interaction }) => {
			if (!entity) return;
			interaction.openModal(
				buildRouterConfigModal(entity.id, entity.data ?? {}),
			);
		},
	},
	{
		id: "dhcp.pc-click",
		on: entityClicked("pc"),
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
		on: modalSubmitted(undefined, "save"),
		guard: ({ event }) =>
			event.type === "MODAL_SUBMITTED" &&
			event.modalId.startsWith("router-config-"),
		handler: ({ event, world, updateContext }) => {
			if (event.type !== "MODAL_SUBMITTED") return;
			const deviceId = event.modalId.replace("router-config-", "");
			const dhcpEnabled = !!event.values.dhcpEnabled;
			const startIp = String(event.values.startIp ?? "");
			const endIp = String(event.values.endIp ?? "");

			world.updateEntity(deviceId, {
				data: { dhcpEnabled, startIp, endIp },
			});

			updateContext((ctx) => {
				ctx.lastConfiguredDeviceId = deviceId;
			});
		},
	},
	{
		id: "dhcp.success-modal-navigate",
		on: modalSubmitted("success", "primary"),
		handler: ({ updateContext }) => {
			updateContext((ctx) => {
				ctx.navigateAway = true;
			});
		},
	},
	{
		id: "dhcp.terminal-command",
		on: terminalInput(),
		guard: ({ phase, state }) =>
			phase === "terminal" && state.question.status !== "completed",
		handler: ({ event, state, terminal, interaction, progress }) => {
			const input = (event as TerminalInputEvent).input.trim().toLowerCase();
			if (!input) return;

			const parts = input.split(/\s+/);
			const command = parts[0];

			if (command === "help") {
				const pc2Ip =
					(state.entities["pc-2"]?.state.ip as string | null) ?? null;
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

			if (command !== "ping") {
				terminal.writeOutput(
					'Error: Unknown command. Type "help" for available commands.',
					"error",
				);
				return;
			}

			if (parts.length < 2) {
				terminal.writeOutput("Error: Missing target.", "error");
				return;
			}

			const target = parts[1];
			const pc2Ip = (state.entities["pc-2"]?.state.ip as string | null) ?? null;

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
		on: terminalInput(),
		guard: ({ phase }) => phase !== "terminal",
		handler: ({ terminal }) => {
			terminal.writeOutput("Error: Terminal is not ready yet.", "error");
		},
	},
];

export type { DhcpBehaviorContext };

export const DHCP_BEHAVIORS: BehaviorDefinition<DhcpBehaviorContext> = {
	initialContext: { lastConfiguredDeviceId: null, navigateAway: false },
	rules,
};
