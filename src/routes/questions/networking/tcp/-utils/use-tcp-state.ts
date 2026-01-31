/**
 * TCP state hook adapted for new Space/Entity model.
 * Simplified version that provides minimal state for rendering.
 */

import { useGameState } from "@/components/game/game-provider";

export type TcpPhase =
	| "mtu"
	| "splitter"
	| "split-send"
	| "syn"
	| "syn-wait"
	| "ack"
	| "connected"
	| "notes"
	| "loss"
	| "resend"
	| "closing"
	| "terminal";

export const useTcpState = () => {
	useGameState();

	// For now, just provide minimal state
	// The old TCP state logic will be adapted gradually
	const phase: TcpPhase = "mtu";
	const splitterVisible = false;
	const serverStatus = "🔴 Disconnected";
	const connectionActive = false;
	const connectionClosed = false;
	const sequenceEnabled = false;
	const lossScenarioActive = false;
	const hasStarted = false;
	const serverLog: Array<{
		id: string;
		type: "output";
		content: string;
		timestamp: number;
	}> = [];
	const bufferSlots: Array<{
		seq: number;
		status: "empty" | "received" | "waiting";
	}> = [];
	const receivedCount = 0;
	const waitingCount = 0;

	return {
		phase,
		splitterVisible,
		serverStatus,
		connectionActive,
		connectionClosed,
		sequenceEnabled,
		lossScenarioActive,
		hasStarted,
		serverLog,
		bufferSlots,
		receivedCount,
		waitingCount,
	};
};
