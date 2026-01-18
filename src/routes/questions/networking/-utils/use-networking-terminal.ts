import { useCallback } from "react";
import type { TerminalCommandHelpers } from "@/components/game/engines";
import { useGameDispatch, useGameState } from "@/components/game/game-provider";
import { buildSuccessModal } from "./modal-builders";

interface UseNetworkingTerminalArgs {
	pc2Ip: string | null;
	onQuestionComplete: () => void;
}

export const useNetworkingTerminal = ({
	pc2Ip,
	onQuestionComplete,
}: UseNetworkingTerminalArgs) => {
	const dispatch = useGameDispatch();
	const state = useGameState();

	const handleCommand = useCallback(
		(input: string, helpers: TerminalCommandHelpers) => {
			if (state.question.status === "completed") return;

			if (state.phase !== "terminal") {
				helpers.writeOutput("Error: Terminal is not ready yet.", "error");
				return;
			}

			const normalized = input.trim().toLowerCase();
			const parts = normalized.split(/\s+/);

			if (parts[0] !== "ping") {
				helpers.writeOutput("Error: Unknown command.", "error");
				return;
			}

			if (parts.length < 2) {
				helpers.writeOutput("Error: Missing target.", "error");
				return;
			}

			const target = parts[1];
			const isValidTarget = target === "pc-2" || (pc2Ip && target === pc2Ip);

			if (isValidTarget && pc2Ip) {
				helpers.writeOutput(
					`Reply from ${pc2Ip}: bytes=32 time<1ms TTL=64`,
					"output",
				);

				dispatch({
					type: "OPEN_MODAL",
					payload: buildSuccessModal(
						"Question complete",
						"You connected two computers and verified their connection using ping.",
						"Next question",
						onQuestionComplete,
					),
				});

				helpers.finishEngine();
				dispatch({ type: "COMPLETE_QUESTION" });
				return;
			}

			helpers.writeOutput(`Error: Unknown target "${target}".`, "error");
		},
		[dispatch, onQuestionComplete, pc2Ip, state.phase, state.question.status],
	);

	return handleCommand;
};
