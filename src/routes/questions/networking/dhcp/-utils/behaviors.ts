import type {
	BehaviorDefinition,
	BehaviorRule,
} from "@/components/game/runtime";
import { entityClicked, modalSubmitted } from "@/components/game/runtime";
import { buildPcConfigModal, buildRouterConfigModal } from "./modal-builders";

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
];

export type { DhcpBehaviorContext };

export const DHCP_BEHAVIORS: BehaviorDefinition<DhcpBehaviorContext> = {
	initialContext: { lastConfiguredDeviceId: null, navigateAway: false },
	rules,
};
