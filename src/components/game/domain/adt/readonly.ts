export type ReadonlyDeep<T> = T extends (...args: never[]) => unknown
	? T
	: T extends readonly (infer U)[]
		? readonly ReadonlyDeep<U>[]
		: T extends object
			? { readonly [K in keyof T]: ReadonlyDeep<T[K]> }
			: T;
