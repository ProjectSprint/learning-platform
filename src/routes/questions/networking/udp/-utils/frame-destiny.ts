import type { UdpClientId } from "./constants";

export const FRAME_DESTINY: Record<number, Record<UdpClientId, boolean>> = {
	1: { a: true, b: true, c: true },
	2: { a: true, b: true, c: false },
	3: { a: true, b: true, c: true },
	4: { a: false, b: true, c: true },
	5: { a: true, b: false, c: true },
	6: { a: true, b: true, c: true },
};

export const TOTAL_FRAMES = 6;
