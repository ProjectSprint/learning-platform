// Modal builders for the networking question
// Creates ModalInstance objects for the data-driven modal system

import type {
	ModalFieldValidator,
	ModalInstance,
} from "@/components/game/modal-types";
import { PRIVATE_IP_RANGES } from "./constants";

const validateIpRange: ModalFieldValidator<string> = (input) => {
	const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
	if (!cidrPattern.test(input)) {
		return "Invalid format. Use 192.168.1.0/24.";
	}

	const [ip, prefix] = input.split("/");
	const prefixNum = Number.parseInt(prefix, 10);
	if (Number.isNaN(prefixNum) || prefixNum < 8 || prefixNum > 30) {
		return "Prefix must be between /8 and /30.";
	}

	if (!PRIVATE_IP_RANGES.some((range) => range.test(ip))) {
		return "Use a private IP range.";
	}

	return null;
};

export const buildRouterConfigModal = (
	deviceId: string,
	currentConfig: Record<string, unknown>,
): ModalInstance => ({
	id: `router-config-${deviceId}`,
	title: "Router configuration",
	content: [
		{
			kind: "field",
			field: {
				id: "dhcpEnabled",
				kind: "checkbox",
				label: "Enable DHCP",
				defaultValue:
					typeof currentConfig.dhcpEnabled === "boolean"
						? currentConfig.dhcpEnabled
						: false,
				helpLink: {
					label: "What is DHCP?",
					href: "https://www.google.com/search?q=what+is+DHCP",
				},
			},
		},
		{
			kind: "field",
			field: {
				id: "ipRange",
				kind: "text",
				label: "IP range (CIDR)",
				placeholder: "192.168.1.0/24",
				defaultValue:
					typeof currentConfig.ipRange === "string"
						? currentConfig.ipRange
						: "",
				validate: validateIpRange,
			},
		},
	],
	actions: [
		{
			id: "cancel",
			label: "Cancel",
			variant: "ghost",
			closesModal: true,
			validate: false,
		},
		{
			id: "save",
			label: "Save",
			variant: "primary",
			async onClick({ values, dispatch }) {
				const dhcpEnabled = !!values.dhcpEnabled;
				const ipRange = String(values.ipRange ?? "");

				dispatch({
					type: "CONFIGURE_DEVICE",
					payload: {
						deviceId,
						config: { dhcpEnabled, ipRange },
					},
				});
			},
		},
	],
});

export const buildPcConfigModal = (
	deviceId: string,
	currentConfig: Record<string, unknown>,
): ModalInstance => {
	const ip =
		typeof currentConfig.ip === "string" ? currentConfig.ip : "Not assigned";

	return {
		id: `pc-config-${deviceId}`,
		title: "PC configuration",
		content: [
			{
				kind: "field",
				field: {
					id: "ip",
					kind: "readonly",
					label: "IP Address",
					value: ip,
				},
			},
		],
		actions: [
			{
				id: "close",
				label: "Close",
				variant: "primary",
				closesModal: true,
				validate: false,
			},
		],
	};
};

export const buildSuccessModal = (
	title: string,
	message: string,
	actionLabel: string,
): ModalInstance => ({
	id: "success",
	title,
	content: [
		{
			kind: "text",
			text: message,
		},
	],
	actions: [
		{
			id: "primary",
			label: actionLabel,
			variant: "primary",
			validate: false,
			closesModal: true,
		},
	],
});
