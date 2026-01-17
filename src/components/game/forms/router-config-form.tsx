import { Box, Button, Checkbox, Flex, Input, Text } from "@chakra-ui/react";
import { useMemo, useState } from "react";

import { useGameDispatch } from "../game-provider";

type RouterConfigFormProps = {
	deviceId: string;
	currentConfig?: Record<string, unknown>;
	onClose: () => void;
};

type ValidationResult = { valid: true } | { valid: false; error: string };

const PRIVATE_IP_RANGES = [
	/^10\./,
	/^172\.(1[6-9]|2\d|3[01])\./,
	/^192\.168\./,
];

const validateIpRange = (input: string): ValidationResult => {
	const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
	if (!cidrPattern.test(input)) {
		return { valid: false, error: "Invalid format. Use 192.168.1.0/24." };
	}

	const [ip, prefix] = input.split("/");
	const prefixNum = Number.parseInt(prefix, 10);
	if (Number.isNaN(prefixNum) || prefixNum < 8 || prefixNum > 30) {
		return { valid: false, error: "Prefix must be between /8 and /30." };
	}

	if (!PRIVATE_IP_RANGES.some((range) => range.test(ip))) {
		return { valid: false, error: "Use a private IP range." };
	}

	return { valid: true };
};

export const RouterConfigForm = ({
	deviceId,
	currentConfig,
	onClose,
}: RouterConfigFormProps) => {
	const dispatch = useGameDispatch();
	const initialDhcpEnabled = useMemo(
		() =>
			typeof currentConfig?.dhcpEnabled === "boolean"
				? currentConfig.dhcpEnabled
				: false,
		[currentConfig?.dhcpEnabled],
	);
	const initialIpRange = useMemo(
		() =>
			typeof currentConfig?.ipRange === "string" ? currentConfig.ipRange : "",
		[currentConfig?.ipRange],
	);

	const [dhcpEnabled, setDhcpEnabled] = useState(initialDhcpEnabled);
	const [ipRange, setIpRange] = useState(initialIpRange);
	const [error, setError] = useState<string | null>(null);
	const [invalidAttempts, setInvalidAttempts] = useState(0);

	const handleSave = () => {
		const validation = validateIpRange(ipRange);
		if (!validation.valid) {
			setError(validation.error);
			const nextAttempts = invalidAttempts + 1;
			setInvalidAttempts(nextAttempts);
			if (nextAttempts >= 2) {
				dispatch({
					type: "SHOW_HINT",
					payload: {
						message: "Use a private CIDR range like 192.168.1.0/24.",
						docsUrl:
							"https://www.google.com/search?q=cidr+notation+private+ip+range",
					},
				});
			}
			return;
		}

		dispatch({
			type: "CONFIGURE_DEVICE",
			payload: {
				deviceId,
				config: {
					dhcpEnabled,
					ipRange,
				},
			},
		});
		setInvalidAttempts(0);
	};

	return (
		<Box display="flex" flexDirection="column" gap={4}>
			<Text fontSize="lg" fontWeight="bold">
				Router configuration
			</Text>

			<Checkbox.Root
				checked={dhcpEnabled}
				onCheckedChange={(details) => setDhcpEnabled(details.checked === true)}
				colorPalette="green"
				size="sm"
			>
				<Checkbox.HiddenInput />
				<Checkbox.Control>
					<Checkbox.Indicator />
				</Checkbox.Control>
				<Checkbox.Label>Enable DHCP</Checkbox.Label>
			</Checkbox.Root>

			<Box>
				<Text fontSize="sm" mb={2}>
					IP range (CIDR)
				</Text>
				<Input
					value={ipRange}
					onChange={(event) => setIpRange(event.target.value)}
					placeholder="192.168.1.0/24"
					size="sm"
					bg="gray.800"
					borderColor="gray.700"
					fontFamily="mono"
				/>
			</Box>

			{error && (
				<Text fontSize="sm" color="red.300">
					{error}
				</Text>
			)}

			<Flex justify="flex-end" gap={2}>
				<Button variant="ghost" size="sm" onClick={onClose}>
					Cancel
				</Button>
				<Button colorPalette="green" size="sm" onClick={handleSave}>
					Save
				</Button>
			</Flex>
		</Box>
	);
};
