export type RuntimeApiSuccess = { ok: true };

export type RuntimeApiFailure = {
	ok: false;
	error: {
		message: string;
	};
};

export type RuntimeApiResult = RuntimeApiSuccess | RuntimeApiFailure;

export const runtimeOk = (): RuntimeApiSuccess => ({ ok: true });

export const runtimeError = (message: string): RuntimeApiFailure => ({
	ok: false,
	error: { message },
});

export const wrapRuntimeErrorMessage = (
	context: string,
	downstreamMessage: string,
): string => `${context}: ${downstreamMessage}`;

export const toRuntimeErrorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);
