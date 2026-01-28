export const createId = (): string => {
	const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } })
		.crypto;
	if (cryptoObj?.randomUUID) {
		return cryptoObj.randomUUID();
	}
	const randomPart =
		Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
	return `id-${Date.now()}-${randomPart}`;
};
