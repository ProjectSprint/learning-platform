// Modal builders for the internet gateway question
// Creates ModalInstance objects for the data-driven modal system

import type {
	ModalFieldValidator,
	ModalInstance,
} from "@/components/game/modal-types";

const PRIVATE_IP_RANGES = [
	/^10\./,
	/^172\.(1[6-9]|2\d|3[01])\./,
	/^192\.168\./,
];

const VALID_DNS_SERVERS = [
	"8.8.8.8",
	"8.8.4.4",
	"1.1.1.1",
	"1.0.0.1",
	"208.67.222.222",
];

const validateIpAddress: ModalFieldValidator<string> = (input) => {
	if (!input) {
		return null;
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

	return null;
};

const validatePrivateIp: ModalFieldValidator<string> = (input, allValues) => {
	const baseError = validateIpAddress(input, allValues);
	if (baseError) {
		return baseError;
	}

	if (!input) {
		return null;
	}

	if (!PRIVATE_IP_RANGES.some((range) => range.test(input))) {
		return "Use a private IP range (192.168.x.x)";
	}

	return null;
};

const validateEndIp: ModalFieldValidator<string> = (input, allValues) => {
	const baseError = validatePrivateIp(input, allValues);
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

const validateDnsServer: ModalFieldValidator<string> = (input) => {
	if (!input) {
		return null;
	}

	const baseError = validateIpAddress(input, {});
	if (baseError) {
		return baseError;
	}

	if (!VALID_DNS_SERVERS.includes(input)) {
		return "DNS server must be a public IP address (e.g., 8.8.8.8)";
	}

	return null;
};

const validatePppoeUsername: ModalFieldValidator<string> = (
	input,
	allValues,
) => {
	const connectionType = allValues.connectionType as string | undefined;
	if (connectionType === "pppoe" && !input) {
		return "Enter your ISP username";
	}
	return null;
};

const validatePppoePassword: ModalFieldValidator<string> = (
	input,
	allValues,
) => {
	const connectionType = allValues.connectionType as string | undefined;
	if (connectionType === "pppoe" && !input) {
		return "Enter your ISP password";
	}
	return null;
};

export const buildRouterLanConfigModal = (
	deviceId: string,
	currentConfig: Record<string, unknown>,
): ModalInstance => ({
	id: `router-lan-config-${deviceId}`,
	title: "Router LAN Configuration",
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
				validate: validatePrivateIp,
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
		{
			kind: "field",
			field: {
				id: "dnsServer",
				kind: "text",
				label: "DNS Server",
				placeholder: "8.8.8.8",
				defaultValue:
					typeof currentConfig.dnsServer === "string"
						? currentConfig.dnsServer
						: "",
				validate: validateDnsServer,
				helpLink: {
					label: "What is DNS?",
					href: "https://www.google.com/search?q=what+is+DNS+server",
				},
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
				const dnsServer = String(values.dnsServer ?? "");

				dispatch({
					type: "CONFIGURE_DEVICE",
					payload: {
						deviceId,
						config: { dhcpEnabled, startIp, endIp, dnsServer },
					},
				});
			},
		},
	],
});

export const buildRouterNatConfigModal = (
	deviceId: string,
	currentConfig: Record<string, unknown>,
): ModalInstance => ({
	id: `router-nat-config-${deviceId}`,
	title: "Router NAT Configuration",
	content: [
		{
			kind: "text",
			text: "NAT (Network Address Translation) allows multiple devices on your home network to share a single public IP address. When enabled, the router translates your private IP (192.168.x.x) to the public IP assigned by your ISP.",
		},
		{
			kind: "field",
			field: {
				id: "natEnabled",
				kind: "checkbox",
				label: "Enable NAT",
				defaultValue:
					typeof currentConfig.natEnabled === "boolean"
						? currentConfig.natEnabled
						: false,
				helpLink: {
					label: "What is NAT?",
					href: "https://www.google.com/search?q=what+is+NAT+network+address+translation",
				},
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
				const natEnabled = !!values.natEnabled;
				dispatch({
					type: "CONFIGURE_DEVICE",
					payload: {
						deviceId,
						config: { natEnabled },
					},
				});
			},
		},
	],
});

export const buildRouterWanConfigModal = (
	deviceId: string,
	currentConfig: Record<string, unknown>,
): ModalInstance => ({
	id: `router-wan-config-${deviceId}`,
	title: "Router WAN Configuration",
	content: [
		{
			kind: "field",
			field: {
				id: "username",
				kind: "text",
				label: "PPPoE Username",
				placeholder: "user@telkom.net",
				defaultValue:
					typeof currentConfig.username === "string"
						? currentConfig.username
						: "",
				validate: validatePppoeUsername,
			},
		},
		{
			kind: "field",
			field: {
				id: "password",
				kind: "text",
				label: "PPPoE Password",
				placeholder: "telkom123",
				defaultValue:
					typeof currentConfig.password === "string"
						? currentConfig.password
						: "",
				validate: validatePppoePassword,
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
				const username = String(values.username ?? "");
				const password = String(values.password ?? "");

				dispatch({
					type: "CONFIGURE_DEVICE",
					payload: {
						deviceId,
						config: { username, password },
					},
				});
			},
		},
	],
});

export const buildPcStatusModal = (
	deviceId: string,
	status: {
		ip?: string;
		status?: string;
	},
): ModalInstance => ({
	id: `pc-status-${deviceId}`,
	title: "PC Status",
	content: [
		{
			kind: "field",
			field: {
				id: "ip",
				kind: "readonly",
				label: "Private IP",
				value: status.ip ?? "Not assigned",
			},
		},
		{
			kind: "field",
			field: {
				id: "status",
				kind: "readonly",
				label: "Status",
				value: status.status ?? "Disconnected",
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
});

export const buildIgwStatusModal = (
	deviceId: string,
	status: {
		status?: string;
	},
): ModalInstance => ({
	id: `igw-status-${deviceId}`,
	title: "Internet Gateway Status",
	content: [
		{
			kind: "field",
			field: {
				id: "status",
				kind: "readonly",
				label: "Connection Status",
				value: status.status ?? "Waiting for authentication",
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
});

export const buildDnsStatusModal = (
	deviceId: string,
	status: {
		ip?: string;
		status?: string;
	},
): ModalInstance => ({
	id: `dns-status-${deviceId}`,
	title: "DNS Server Status",
	content: [
		{
			kind: "field",
			field: {
				id: "ip",
				kind: "readonly",
				label: "DNS Server",
				value: status.ip ?? "Unreachable",
			},
		},
		{
			kind: "field",
			field: {
				id: "status",
				kind: "readonly",
				label: "Status",
				value: status.status ?? "Unreachable",
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
});

export const buildGoogleStatusModal = (
	deviceId: string,
	status: {
		domain?: string;
		ip?: string;
		status?: string;
		reason?: string;
	},
): ModalInstance => {
	const content: ModalInstance["content"] = [
		{
			kind: "field",
			field: {
				id: "domain",
				kind: "readonly",
				label: "Domain",
				value: status.domain ?? "google.com",
			},
		},
		{
			kind: "field",
			field: {
				id: "ip",
				kind: "readonly",
				label: "IP Address",
				value: status.ip ?? "Can't resolve",
			},
		},
		{
			kind: "field",
			field: {
				id: "status",
				kind: "readonly",
				label: "Status",
				value: status.status ?? "Unreachable",
			},
		},
	];

	if (status.reason && status.status === "Unreachable") {
		content.push({
			kind: "field",
			field: {
				id: "reason",
				kind: "readonly",
				label: "Reason",
				value: status.reason,
			},
		});
	}

	return {
		id: `google-status-${deviceId}`,
		title: "Google Server Status",
		content,
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
	onAction?: () => void,
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
			onClick: onAction ? () => onAction() : undefined,
		},
	],
});
