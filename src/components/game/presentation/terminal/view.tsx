import { Box, type BoxProps, Flex, Text } from "@chakra-ui/react";
import { memo, useEffect, useMemo, useRef } from "react";

import type { TerminalEntry } from "../../game-provider";

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

const TerminalEntryRow = memo(
	({ entry, entryPrefix }: { entry: TerminalEntry; entryPrefix?: string }) => {
		const styles = entryStyles[entry.type];
		const content = entryPrefix
			? `${entryPrefix}${entry.content}`
			: entry.type === "input"
				? `> ${entry.content}`
				: entry.content;

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
	},
);

export type TerminalViewProps = {
	history: TerminalEntry[];
	prompt?: string;
	isCompleted?: boolean;
	completionMessage?: string;
	entryPrefix?: string;
	containerProps?: BoxProps;
};

export const TerminalView = ({
	history,
	prompt,
	isCompleted = false,
	completionMessage = "Question completed. Terminal input is disabled.",
	entryPrefix,
	containerProps,
}: TerminalViewProps) => {
	const historyRef = useRef<HTMLDivElement | null>(null);
	const { flex = "1", ...restContainerProps } = containerProps ?? {};

	const promptBlock = useMemo(() => {
		if (!prompt) {
			return null;
		}
		return (
			<Text fontSize="sm" color="gray.100" fontWeight="bold">
				{prompt}
			</Text>
		);
	}, [prompt]);

	useEffect(() => {
		if (history.length === 0 && !prompt) {
			return;
		}
		historyRef.current?.scrollTo({
			top: historyRef.current.scrollHeight,
			behavior: "smooth",
		});
	}, [history.length, prompt]);

	return (
		<Box
			ref={historyRef}
			flex={flex}
			overflowY="auto"
			px={4}
			py={3}
			fontFamily="mono"
			role="log"
			aria-live="polite"
			{...restContainerProps}
		>
			<Flex direction="column" gap={2}>
				{promptBlock}
				{history.map((entry) => (
					<TerminalEntryRow
						key={entry.id}
						entry={entry}
						entryPrefix={entryPrefix}
					/>
				))}
				{isCompleted && (
					<Text fontSize="sm" color="green.300" fontWeight="bold">
						{completionMessage}
					</Text>
				)}
			</Flex>
		</Box>
	);
};
