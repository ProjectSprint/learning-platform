import type {
	BehaviorDefinition,
	BehaviorRule,
} from "@/components/game/runtime";
import { modalSubmitted } from "@/components/game/runtime";

type DhcpBehaviorContext = {
	lastConfiguredDeviceId: string | null;
};

const rules: BehaviorRule<DhcpBehaviorContext>[] = [
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
];

export type { DhcpBehaviorContext };

export const DHCP_BEHAVIORS: BehaviorDefinition<DhcpBehaviorContext> = {
	initialContext: { lastConfiguredDeviceId: null },
	rules,
};
