/**
 * UDP state hook adapted for new Space/Entity model.
 * Simplified version that provides minimal state for rendering.
 */

import { useMemo } from "react";
import { useGameState } from "@/components/game/game-provider";
import { UDP_CLIENT_IDS } from "./constants";
import type { UdpPhase } from "./types";

export type UdpNotice = { message: string; tone: "error" | "info" } | null;

const TOTAL_FRAMES = 6;

export const useUdpState = () => {
	useGameState();

	// For now, just provide minimal state
	// The old UDP state logic will be adapted gradually
	const phase: UdpPhase = "intro";
	const lastSentFrame = 0;
	const expectedFrame = 1;
	const notice: UdpNotice = null;

	const clientProgress = useMemo(
		() =>
			UDP_CLIENT_IDS.map((clientId) => ({
				clientId,
				frames: Array.from({ length: TOTAL_FRAMES }, () => false),
				receivedCount: 0,
				percent: 0,
			})),
		[],
	);

	return {
		phase,
		lastSentFrame,
		expectedFrame,
		clientProgress,
		notice,
	};
};
