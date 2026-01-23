import type { KeyboardEvent, RefObject } from "react";
import { useCallback, useRef, useState } from "react";

import { useGameDispatch } from "./game-provider";

const MAX_INPUT_LENGTH = 200;
const MAX_COMMAND_HISTORY = 50;

const sanitizeInput = (input: string) =>
	input
		.slice(0, MAX_INPUT_LENGTH)
		.replace(/<[^>]*>/g, "")
		.replace(/[<>"'&]/g, "")
		.trim();

type TerminalInputController = {
	value: string;
	onChange: (value: string) => void;
	onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
	inputRef: RefObject<HTMLInputElement | null>;
};

export const useTerminalInput = (): TerminalInputController => {
	const dispatch = useGameDispatch();
	const [input, setInput] = useState("");
	const [historyIndex, setHistoryIndex] = useState<number | null>(null);
	const [commandHistory, setCommandHistory] = useState<string[]>([]);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleSubmit = useCallback(() => {
		const sanitized = sanitizeInput(input);
		if (!sanitized) {
			return;
		}

		dispatch({ type: "SUBMIT_COMMAND", payload: { input: sanitized } });
		setInput("");
		setHistoryIndex(null);
		setCommandHistory((prev) =>
			[...prev, sanitized].slice(-MAX_COMMAND_HISTORY),
		);
	}, [dispatch, input]);

	const handleHistoryUp = useCallback(() => {
		if (commandHistory.length === 0) {
			return;
		}

		if (historyIndex === null) {
			const lastIndex = commandHistory.length - 1;
			setHistoryIndex(lastIndex);
			setInput(commandHistory[lastIndex]);
			return;
		}

		const nextIndex = Math.max(historyIndex - 1, 0);
		setHistoryIndex(nextIndex);
		setInput(commandHistory[nextIndex]);
	}, [commandHistory, historyIndex]);

	const handleHistoryDown = useCallback(() => {
		if (historyIndex === null) {
			return;
		}

		const nextIndex = historyIndex + 1;
		if (nextIndex >= commandHistory.length) {
			setHistoryIndex(null);
			setInput("");
			return;
		}

		setHistoryIndex(nextIndex);
		setInput(commandHistory[nextIndex]);
	}, [commandHistory, historyIndex]);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			if (event.key === "Enter") {
				event.preventDefault();
				handleSubmit();
				return;
			}

			if (event.key === "ArrowUp") {
				event.preventDefault();
				handleHistoryUp();
				return;
			}

			if (event.key === "ArrowDown") {
				event.preventDefault();
				handleHistoryDown();
				return;
			}

			if (event.key === "Escape") {
				event.preventDefault();
				setInput("");
				setHistoryIndex(null);
				return;
			}

			if (event.key.toLowerCase() === "l" && event.ctrlKey) {
				event.preventDefault();
				dispatch({ type: "CLEAR_TERMINAL_HISTORY" });
			}
		},
		[dispatch, handleHistoryDown, handleHistoryUp, handleSubmit],
	);

	return {
		value: input,
		onChange: setInput,
		onKeyDown: handleKeyDown,
		inputRef,
	};
};
