// Custom hook for handling terminal commands in the networking question
// Processes ping commands and manages command validation and hints

import { useEffect, useRef } from "react";
import { useGameDispatch, useGameState } from "@/components/game/game-provider";

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
	const invalidCommandCountRef = useRef(0);

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
			invalidCommandCountRef.current += 1;
			dispatch({
				type: "ADD_TERMINAL_OUTPUT",
				payload: {
					type: "error",
					content: "Error: Unknown command.",
				},
			});
		} else if (parts.length < 2) {
			invalidCommandCountRef.current += 1;
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
				invalidCommandCountRef.current = 0;
				dispatch({
					type: "ADD_TERMINAL_OUTPUT",
					payload: {
						type: "output",
						content: `Reply from ${pc2Ip}: bytes=32 time<1ms TTL=64`,
					},
				});
				dispatch({
					type: "OPEN_MODAL",
					payload: {
						type: "success",
						data: {
							title: "Question complete",
							message:
								"You connected two computers and verified their connection using ping.",
							actionLabel: "Next question",
						},
					},
				});
				dispatch({ type: "COMPLETE_QUESTION" });
				return;
			}

			// Handle invalid target
			invalidCommandCountRef.current += 1;
			dispatch({
				type: "ADD_TERMINAL_OUTPUT",
				payload: {
					type: "error",
					content: `Error: Unknown target "${target}".`,
				},
			});
		}

		// Provide hints after repeated failures
		if (
			invalidCommandCountRef.current === 2 &&
			!state.overlay.activeModal &&
			state.overlay.hints.length === 0
		) {
			dispatch({
				type: "SHOW_HINT",
				payload: {
					message: "That reachability test is commonly called ping.",
					docsUrl: "https://www.google.com/search?q=ping+command",
				},
			});
		}

		if (
			invalidCommandCountRef.current === 3 &&
			!state.overlay.activeModal &&
			state.overlay.hints.length === 0
		) {
			dispatch({
				type: "SHOW_HINT",
				payload: {
					message: "Target the other PC or its IP address.",
					docsUrl: "https://www.google.com/search?q=ping+ip+address",
				},
			});
		}
	}, [
		dispatch,
		pc2Ip,
		state.overlay.activeModal,
		state.overlay.hints.length,
		state.phase,
		state.question.status,
		state.terminal.history,
	]);
};
