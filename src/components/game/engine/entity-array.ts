export type EntityArray<T = string> = { items: T[] };

export const createEntityArray = <T = string>(): EntityArray<T> => ({
	items: [],
});

// Mutating — designed for use inside updateContext callbacks
export const arrayPush = <T>(a: EntityArray<T>, item: T): void => {
	a.items.push(item);
};
export const arrayPop = <T>(a: EntityArray<T>): T | null =>
	a.items.pop() ?? null;
export const arrayShift = <T>(a: EntityArray<T>): T | null =>
	a.items.shift() ?? null;
export const arrayUnshift = <T>(a: EntityArray<T>, item: T): void => {
	a.items.unshift(item);
};
export const arrayRemove = <T>(a: EntityArray<T>, item: T): void => {
	const i = a.items.indexOf(item);
	if (i !== -1) a.items.splice(i, 1);
};

// Non-mutating reads
export const arrayPeekHead = <T>(a: EntityArray<T>): T | null =>
	a.items[0] ?? null;
export const arrayPeekTail = <T>(a: EntityArray<T>): T | null =>
	a.items[a.items.length - 1] ?? null;
export const arraySize = <T>(a: EntityArray<T>): number => a.items.length;
export const arrayHas = <T>(a: EntityArray<T>, item: T): boolean =>
	a.items.includes(item);
export const arrayAll = <T>(a: EntityArray<T>): readonly T[] => a.items;
