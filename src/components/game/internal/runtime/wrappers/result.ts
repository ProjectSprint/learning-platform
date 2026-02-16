import type {
	_RuntimeApiFailure,
	_RuntimeApiSuccess,
} from "@/components/game/types/runtime";

export const runtimeOk = (): _RuntimeApiSuccess => ({ ok: true });

export const runtimeError = (message: string): _RuntimeApiFailure => ({
	ok: false,
	error: { message },
});

export const wrapRuntimeErrorMessage = (
	context: string,
	downstreamMessage: string,
): string => `${context}: ${downstreamMessage}`;

export const toRuntimeErrorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);
