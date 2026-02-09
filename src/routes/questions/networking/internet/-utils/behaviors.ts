import type { GameState } from "@/components/game/application/state/types";
import type {
	BehaviorDefinition,
	BehaviorRule,
} from "@/components/game/runtime";
import { entityClicked, modalSubmitted } from "@/components/game/runtime";
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

	return {
		dnsServer,
		hasValidDnsServer,
		natEnabled,
		hasValidPppoeCredentials,
		googleReachable,
		googleIp: GOOGLE_IP,
	};
}

const rules: BehaviorRule<InternetBehaviorContext>[] = [
	// --- Entity click handlers ---
	{
		id: "internet.router-lan-click",
		on: entityClicked("router-lan"),
		handler: ({ entity, interaction }) => {
			if (!entity) return;
			interaction.openModal(
				buildRouterLanConfigModal(entity.id, entity.data ?? {}),
			);
		},
	},
	{
		id: "internet.router-nat-click",
		on: entityClicked("router-nat"),
		handler: ({ entity, interaction }) => {
			if (!entity) return;
			interaction.openModal(
				buildRouterNatConfigModal(entity.id, entity.data ?? {}),
			);
		},
	},
	{
		id: "internet.router-wan-click",
		on: entityClicked("router-wan"),
		handler: ({ entity, interaction }) => {
			if (!entity) return;
			interaction.openModal(
				buildRouterWanConfigModal(entity.id, entity.data ?? {}),
			);
		},
	},
	{
		id: "internet.pc-click",
		on: entityClicked("pc"),
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
		on: entityClicked("igw"),
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
		on: entityClicked("dns"),
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
		on: entityClicked("google"),
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
		on: modalSubmitted(undefined, "save"),
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
		on: modalSubmitted(undefined, "save"),
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
		on: modalSubmitted(undefined, "save"),
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
		on: modalSubmitted("success", "primary"),
		handler: ({ updateContext }) => {
			updateContext((ctx) => {
				ctx.navigateAway = true;
			});
		},
	},
];

export const INTERNET_BEHAVIORS: BehaviorDefinition<InternetBehaviorContext> = {
	initialContext: { navigateAway: false },
	rules,
};
