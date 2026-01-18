// Modal builders for the networking question
// Creates ModalInstance objects for the data-driven modal system

import type {
	ModalFieldValidator,
	ModalInstance,
} from "@/components/game/modal-types";
import { PRIVATE_IP_RANGES } from "./constants";

const validateIpAddress: ModalFieldValidator<string> = (input) => {
	if (!input) {
		return null; // Allow empty, will be caught by range validation
	}

	const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
	const match = input.match(ipPattern);

	if (!match) {
		return "Invalid format. Use 192.168.1.100";
	}

	const octets = [match[1], match[2], match[3], match[4]].map((s) =>
		Number.parseInt(s, 10),
	);

	if (octets.some((n) => n < 0 || n > 255)) {
		return "Each number must be 0-255.";
	}

	if (!PRIVATE_IP_RANGES.some((range) => range.test(input))) {
		return "Use a private IP range.";
	}

	return null;
};

const validateEndIp: ModalFieldValidator<string> = (input, allValues) => {
	const baseError = validateIpAddress(input, allValues);
	if (baseError) {
		return baseError;
	}

	const startIp = allValues.startIp as string | undefined;
	if (!startIp || !input) {
		return null;
	}

	const parseIp = (ip: string): number => {
		const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
		return (
			((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
		);
	};

	const startNum = parseIp(startIp);
	const endNum = parseIp(input);

	if (endNum < startNum) {
		return "End IP must be greater than start IP.";
	}

	if (endNum - startNum + 1 < 2) {
		return "Range must have at least 2 addresses.";
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
				id: "startIp",
				kind: "text",
				label: "Start IP",
				placeholder: "192.168.1.100",
				defaultValue:
					typeof currentConfig.startIp === "string"
						? currentConfig.startIp
						: "",
				validate: validateIpAddress,
			},
		},
		{
			kind: "field",
			field: {
				id: "endIp",
				kind: "text",
				label: "End IP",
				placeholder: "192.168.1.200",
				defaultValue:
					typeof currentConfig.endIp === "string" ? currentConfig.endIp : "",
				validate: validateEndIp,
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
				const startIp = String(values.startIp ?? "");
				const endIp = String(values.endIp ?? "");

				dispatch({
					type: "CONFIGURE_DEVICE",
					payload: {
						deviceId,
						config: { dhcpEnabled, startIp, endIp },
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
