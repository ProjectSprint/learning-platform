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

export type DeliveryResult = "delivered" | "lost";

export function getFrameDestiny(
	frameNumber: number,
	clientId: UdpClientId,
): DeliveryResult {
	const delivered = FRAME_DESTINY[frameNumber]?.[clientId] ?? false;
	return delivered ? "delivered" : "lost";
}

export function getClientReceivedFrames(clientId: UdpClientId): number[] {
	const received: number[] = [];
	for (let frameNum = 1; frameNum <= TOTAL_FRAMES; frameNum++) {
		if (FRAME_DESTINY[frameNum]?.[clientId]) {
			received.push(frameNum);
		}
	}
	return received;
}

export function getClientLostFrames(clientId: UdpClientId): number[] {
	const lost: number[] = [];
	for (let frameNum = 1; frameNum <= TOTAL_FRAMES; frameNum++) {
		if (!FRAME_DESTINY[frameNum]?.[clientId]) {
			lost.push(frameNum);
		}
	}
	return lost;
}

export function getClientDeliveryPercentage(clientId: UdpClientId): number {
	const received = getClientReceivedFrames(clientId).length;
	return Math.round((received / TOTAL_FRAMES) * 100);
}
