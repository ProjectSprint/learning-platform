import { useEffect } from "react";
import { useGameDispatch, useGameState } from "@/components/game/game-provider";

const DEFAULT_HINT_DELAY_MS = 3000;

type ContextualHintOptions = {
	delayMs?: number;
};

export const useContextualHint = (
	content: string,
	options: ContextualHintOptions = {},
) => {
	const dispatch = useGameDispatch();
	const { hint } = useGameState();
	const delayMs = options.delayMs ?? DEFAULT_HINT_DELAY_MS;

	useEffect(() => {
		const nextContent = content.trim();
		if (!nextContent) {
			if (hint.visible || hint.content) {
				dispatch({ type: "HIDE_HINT" });
			}
			return;
		}

		if (hint.content !== nextContent) {
			dispatch({ type: "REPLACE_HINT", payload: { content: nextContent } });
		}

		if (hint.visible) {
			return;
		}

		if (delayMs <= 0) {
			dispatch({ type: "SHOW_HINT", payload: { content: nextContent } });
			return;
		}

		const timer = setTimeout(() => {
			dispatch({ type: "SHOW_HINT", payload: { content: nextContent } });
		}, delayMs);

		return () => clearTimeout(timer);
	}, [content, delayMs, dispatch, hint.content, hint.visible]);
};
