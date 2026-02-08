import { useEffect } from "react";
import { useHintStore } from "./hint-context";

const DEFAULT_HINT_DELAY_MS = 3000;

type ContextualHintOptions = {
	delayMs?: number;
};

export const useContextualHint = (
	content: string,
	options: ContextualHintOptions = {},
) => {
	const { hint, hideHint, replaceHint, showHint } = useHintStore();
	const delayMs = options.delayMs ?? DEFAULT_HINT_DELAY_MS;

	useEffect(() => {
		const nextContent = content.trim();
		if (!nextContent) {
			if (hint.visible || hint.content) {
				hideHint();
			}
			return;
		}

		if (hint.content !== nextContent) {
			replaceHint(nextContent);
		}

		if (hint.visible) {
			return;
		}

		if (delayMs <= 0) {
			showHint(nextContent);
			return;
		}

		const timer = setTimeout(() => {
			showHint(nextContent);
		}, delayMs);

		return () => clearTimeout(timer);
	}, [
		content,
		delayMs,
		hideHint,
		hint.content,
		hint.visible,
		replaceHint,
		showHint,
	]);
};
