// Custom hook for handling terminal commands in the networking question
// Processes ping commands and manages command validation

import { useEffect, useRef } from "react";
import { useGameDispatch, useGameState } from "@/components/game/game-provider";
import { buildSuccessModal } from "./modal-builders";

interface UseTerminalHandlerProps {
	pc2Ip: string | null;
}

/**
 * Handles terminal command input and processing for the networking question
 * Validates ping commands and provides appropriate feedback
 */
export const useTerminalHandler = ({ pc2Ip }: UseTerminalHandlerProps) => {
	const state = useGameState();
	const dispatch = useGameDispatch();
	const lastInputIdRef = useRef<string | null>(null);

	useEffect(() => {
		const lastEntry = state.terminal.history[state.terminal.history.length - 1];
		if (!lastEntry || lastEntry.type !== "input") {
			return;
		}

		// Skip if we've already processed this input
		if (lastEntry.id === lastInputIdRef.current) {
			return;
		}

		lastInputIdRef.current = lastEntry.id;

		if (state.question.status === "completed") {
			return;
		}

		// Validate terminal is ready
		if (state.phase !== "terminal") {
			dispatch({
				type: "ADD_TERMINAL_OUTPUT",
				payload: {
					type: "error",
					content: "Error: Terminal is not ready yet.",
				},
			});
			return;
		}

		// Parse and validate command
		const normalized = lastEntry.content.trim().toLowerCase();
		const parts = normalized.split(/\s+/);

		if (parts[0] !== "ping") {
			dispatch({
				type: "ADD_TERMINAL_OUTPUT",
				payload: {
					type: "error",
					content: "Error: Unknown command.",
				},
			});
		} else if (parts.length < 2) {
			dispatch({
				type: "ADD_TERMINAL_OUTPUT",
				payload: {
					type: "error",
					content: "Error: Missing target.",
				},
			});
		} else {
			const target = parts[1];
			const isValidTarget = target === "pc-2" || (pc2Ip && target === pc2Ip);

			// Handle successful ping
			if (isValidTarget && pc2Ip) {
				dispatch({
					type: "ADD_TERMINAL_OUTPUT",
					payload: {
						type: "output",
						content: `Reply from ${pc2Ip}: bytes=32 time<1ms TTL=64`,
					},
				});
				dispatch({
					type: "OPEN_MODAL",
					payload: buildSuccessModal(
						"Question complete",
						"You connected two computers and verified their connection using ping.",
						"Next question",
					),
				});
				dispatch({ type: "COMPLETE_QUESTION" });
				return;
			}

			// Handle invalid target
			dispatch({
				type: "ADD_TERMINAL_OUTPUT",
				payload: {
					type: "error",
					content: `Error: Unknown target "${target}".`,
				},
			});
		}
	}, [
		dispatch,
		pc2Ip,
		state.phase,
		state.question.status,
		state.terminal.history,
	]);
};
