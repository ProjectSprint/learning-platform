import { Box, Button, Flex, Input, Text } from "@chakra-ui/react";
import { useMemo, useState } from "react";

import { useGameDispatch } from "../game-provider";

type PCConfigFormProps = {
	deviceId: string;
	currentConfig?: Record<string, unknown>;
	onClose: () => void;
};

const validateIp = (value: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(value);

export const PCConfigForm = ({
	deviceId,
	currentConfig,
	onClose,
}: PCConfigFormProps) => {
	const dispatch = useGameDispatch();
	const initialIp = useMemo(
		() => (typeof currentConfig?.ip === "string" ? currentConfig.ip : ""),
		[currentConfig?.ip],
	);
	const [ip, setIp] = useState(initialIp);
	const [error, setError] = useState<string | null>(null);

	const handleSave = () => {
		if (ip && !validateIp(ip)) {
			setError("Enter a valid IPv4 address.");
			return;
		}

		dispatch({
			type: "CONFIGURE_DEVICE",
			payload: {
				deviceId,
				config: {
					ip: ip || null,
				},
			},
		});
	};

	return (
		<Box display="flex" flexDirection="column" gap={4}>
			<Text fontSize="lg" fontWeight="bold">
				PC configuration
			</Text>

			<Box>
				<Text fontSize="sm" mb={2}>
					IP address
				</Text>
				<Input
					value={ip}
					onChange={(event) => setIp(event.target.value)}
					placeholder="192.168.1.2"
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
