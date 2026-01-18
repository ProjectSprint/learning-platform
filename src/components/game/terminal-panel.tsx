import { Box, Flex, Input, Text } from "@chakra-ui/react";
import {
	type KeyboardEvent,
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import {
	type TerminalEntry,
	useGameDispatch,
	useGameState,
} from "./game-provider";

const MAX_INPUT_LENGTH = 200;
const MAX_COMMAND_HISTORY = 50;

const sanitizeInput = (input: string) =>
	input
		.slice(0, MAX_INPUT_LENGTH)
		.replace(/<[^>]*>/g, "")
		.replace(/[<>"'&]/g, "")
		.trim();

const entryStyles: Record<
	TerminalEntry["type"],
	{ color: string; fontStyle?: "italic"; fontWeight?: "bold" }
> = {
	prompt: { color: "gray.100", fontWeight: "bold" },
	input: { color: "green.300" },
	output: { color: "gray.200" },
	error: { color: "red.300" },
	hint: { color: "gray.400", fontStyle: "italic" },
};

const TerminalEntryRow = memo(({ entry }: { entry: TerminalEntry }) => {
	const styles = entryStyles[entry.type];
	const content = entry.type === "input" ? `> ${entry.content}` : entry.content;

	return (
		<Text
			fontSize="sm"
			color={styles.color}
			fontStyle={styles.fontStyle}
			fontWeight={styles.fontWeight}
		>
			{content}
		</Text>
	);
});

export const TerminalPanel = () => {
	const { terminal, question } = useGameState();
	const dispatch = useGameDispatch();
	const [input, setInput] = useState("");
	const [historyIndex, setHistoryIndex] = useState<number | null>(null);
	const [commandHistory, setCommandHistory] = useState<string[]>([]);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const historyRef = useRef<HTMLDivElement | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);

	const isCompleted = question.status === "completed";
	const visible = terminal.visible;

	const promptBlock = useMemo(() => {
		if (!terminal.prompt) {
			return null;
		}
		return (
			<Text fontSize="sm" color="gray.100" fontWeight="bold">
				{terminal.prompt}
			</Text>
		);
	}, [terminal.prompt]);

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

	useEffect(() => {
		if (terminal.history.length === 0 && !terminal.prompt) {
			return;
		}
		historyRef.current?.scrollTo({
			top: historyRef.current.scrollHeight,
			behavior: "smooth",
		});
	}, [terminal.history.length, terminal.prompt]);

	useEffect(() => {
		if (visible && !isCollapsed) {
			inputRef.current?.focus();
		}
	}, [visible, isCollapsed]);

	const handleToggleCollapse = useCallback(() => {
		setIsCollapsed((prev) => !prev);
	}, []);

	const handleExpandClick = useCallback(() => {
		setIsCollapsed(false);
	}, []);

	if (!visible) {
		return null;
	}

	if (isCollapsed) {
		return (
			<Box
				position="fixed"
				bottom={0}
				left={0}
				right={0}
				zIndex={100}
				bg="gray.900"
				borderTop="1px solid"
				borderColor="gray.700"
				cursor="pointer"
				onClick={handleExpandClick}
				_hover={{ bg: "gray.800" }}
				role="button"
				aria-label="Expand terminal"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleExpandClick();
					}
				}}
			>
				<Flex align="center" justify="flex-start" px={4} py={3}>
					<Text fontWeight="bold" color="gray.100" fontFamily="mono">
						Terminal
					</Text>
				</Flex>
			</Box>
		);
	}

	return (
		<Box
			as="section"
			role="region"
			aria-label="Command Terminal"
			position="fixed"
			bottom={0}
			left={0}
			right={0}
			height="40vh"
			bg="gray.900"
			color="gray.200"
			fontFamily="mono"
			borderTop="1px solid"
			borderColor="gray.700"
			display="flex"
			flexDirection="column"
			zIndex={100}
		>
			<Flex
				align="center"
				justify="space-between"
				px={4}
				py={2}
				borderBottom="1px solid"
				borderColor="gray.800"
				flexShrink={0}
			>
				<Text fontWeight="bold" color="gray.100" fontSize="sm">
					Terminal
				</Text>
				<Box
					asChild
					px={2}
					py={1}
					borderRadius="md"
					color="gray.400"
					_hover={{ bg: "gray.800", color: "gray.100" }}
					cursor="pointer"
				>
					<button
						type="button"
						onClick={handleToggleCollapse}
						aria-label="Collapse terminal"
					>
						<Text fontSize="xs">✕</Text>
					</button>
				</Box>
			</Flex>

			<Box
				ref={historyRef}
				flex="1"
				overflowY="auto"
				px={4}
				py={3}
				role="log"
				aria-live="polite"
			>
				<Flex direction="column" gap={2}>
					{promptBlock}
					{terminal.history.map((entry) => (
						<TerminalEntryRow key={entry.id} entry={entry} />
					))}
					{isCompleted && (
						<Text fontSize="sm" color="green.300" fontWeight="bold">
							Question completed. Terminal input is disabled.
						</Text>
					)}
				</Flex>
			</Box>

			<Box px={4} py={3} borderTop="1px solid" borderColor="gray.800">
				<Input
					ref={inputRef}
					value={input}
					onChange={(event) => setInput(event.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={isCompleted ? "Terminal disabled" : "Type a command"}
					size="sm"
					fontFamily="mono"
					bg="gray.800"
					borderColor="gray.700"
					_placeholder={{ color: "gray.500" }}
					disabled={isCompleted}
					aria-label="Terminal input"
				/>
			</Box>
		</Box>
	);
};
