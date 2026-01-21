import { Box, Flex, Text } from "@chakra-ui/react";
import type { ReactNode, RefObject } from "react";
import { useCallback, useEffect, useState } from "react";

type TerminalLayoutProps = {
	visible: boolean;
	view: ReactNode;
	input?: ReactNode;
	title?: string;
	height?: string;
	focusRef?: RefObject<HTMLElement>;
};

export const TerminalLayout = ({
	visible,
	view,
	input,
	title = "Terminal",
	height = "40vh",
	focusRef,
}: TerminalLayoutProps) => {
	const [isCollapsed, setIsCollapsed] = useState(false);

	useEffect(() => {
		if (visible && !isCollapsed) {
			focusRef?.current?.focus();
		}
	}, [focusRef, isCollapsed, visible]);

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
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						handleExpandClick();
					}
				}}
			>
				<Flex align="center" justify="flex-start" px={4} py={3}>
					<Text fontWeight="bold" color="gray.100" fontFamily="mono">
						{title}
					</Text>
				</Flex>
			</Box>
		);
	}

	return (
		<Box
			as="section"
			role="region"
			aria-label={title}
			position="fixed"
			bottom={0}
			left={0}
			right={0}
			height={height}
			bg="gray.900"
			color="gray.200"
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
					{title}
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

			{view}

			{input && (
				<Box px={4} py={3} borderTop="1px solid" borderColor="gray.800">
					{input}
				</Box>
			)}
		</Box>
	);
};
