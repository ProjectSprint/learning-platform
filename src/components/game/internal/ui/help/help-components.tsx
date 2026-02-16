import { Box, Flex, Link, Text } from "@chakra-ui/react";
import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { Tooltip } from "@/components/ui/tooltip";

type HelpLinkProps = {
	text: string;
	href: string;
};

export const HelpLink = ({ text, href }: HelpLinkProps) => (
	<Link
		href={href}
		target="_blank"
		rel="noopener noreferrer"
		fontSize="xs"
		color="cyan.400"
		_hover={{ color: "cyan.300", textDecoration: "underline" }}
	>
		{text}
	</Link>
);

type InfoTooltipProps = {
	content: ReactNode;
	seeMoreHref?: string;
	seeMoreText?: string;
};

export const InfoTooltip = ({
	content,
	seeMoreHref,
	seeMoreText = "See more",
}: InfoTooltipProps) => (
	<Tooltip
		interactive
		positioning={{ placement: "top", gutter: 4 }}
		openDelay={100}
		closeDelay={200}
		contentProps={{
			bg: "gray.800",
			color: "gray.100",
			borderColor: "gray.700",
			css: { "--tooltip-bg": "var(--chakra-colors-gray-800)" },
		}}
		content={
			<Box maxW="200px" p={1}>
				<Text fontSize="xs" color="gray.100" mb={seeMoreHref ? 1 : 0}>
					{content}
				</Text>
				{seeMoreHref && (
					<Link
						href={seeMoreHref}
						target="_blank"
						rel="noopener noreferrer"
						fontSize="xs"
						color="cyan.400"
						_hover={{ color: "cyan.300", textDecoration: "underline" }}
					>
						{seeMoreText}
					</Link>
				)}
			</Box>
		}
	>
		<Flex
			as="span"
			align="center"
			justify="center"
			w="16px"
			h="16px"
			borderRadius="full"
			bg="gray.700"
			cursor="help"
			_hover={{ bg: "gray.600" }}
		>
			<Info size={10} color="currentColor" />
		</Flex>
	</Tooltip>
);
