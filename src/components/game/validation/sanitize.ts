// Input sanitization utilities
// Protect against XSS and other injection attacks

export const MAX_HISTORY_ENTRIES = 100;
export const MAX_INPUT_LENGTH = 200;
export const MAX_OUTPUT_LENGTH = 500;
export const MAX_CONFIG_VALUE_LENGTH = 100;
export const MAX_INVENTORY_ITEMS = 50;

export const sanitizeText = (value: string, maxLength: number): string =>
	value
		.slice(0, maxLength)
		.replace(/<[^>]*>/g, "")
		.replace(/[<>"'&]/g, "")
		.trim();

export const sanitizeTerminalInput = (input: string): string =>
	sanitizeText(input, MAX_INPUT_LENGTH);

export const sanitizeTerminalOutput = (output: string): string =>
	sanitizeText(output, MAX_OUTPUT_LENGTH);

export const sanitizeConfigValue = (value: string): string =>
	sanitizeText(value, MAX_CONFIG_VALUE_LENGTH);

export const sanitizeDeviceConfig = (
	config: Record<string, unknown>,
): Record<string, unknown> => {
	const sanitized: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(config)) {
		if (value === null) {
			sanitized[key] = null;
			continue;
		}

		if (typeof value === "string") {
			sanitized[key] = sanitizeConfigValue(value);
			continue;
		}

		if (typeof value === "number" || typeof value === "boolean") {
			sanitized[key] = value;
		}
	}

	return sanitized;
};
