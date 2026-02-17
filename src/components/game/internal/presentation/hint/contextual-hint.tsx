import { Box, Flex, type FlexProps, Text } from "@chakra-ui/react";
import { memo } from "react";
import { useHintStore } from "./hint-context";
import { PaperclipCharacter } from "./paperclip-character";
import { detectPose } from "./paperclip-paths";

/**
 * Slide-in keyframe for the overall hint container.
 * GSAP handles all character animation internally.
 */
const HintKeyframes = memo(() => (
	<style>{`
		@keyframes hint-appear {
			from { opacity: 0; transform: translateX(-10px); }
			to   { opacity: 1; transform: translateX(0); }
		}
	`}</style>
));
HintKeyframes.displayName = "HintKeyframes";

/* ------------------------------------------------------------------ */
/*  Chat-bubble hint                                                  */
/* ------------------------------------------------------------------ */
type ContextualHintProps = {
	containerProps?: FlexProps;
};

export const ContextualHint = ({ containerProps }: ContextualHintProps) => {
	const { hint } = useHintStore();

	if (!hint.visible || !hint.content) {
		return null;
	}

	const pose = detectPose(hint.content);

	return (
		<>
			<HintKeyframes />
			<Flex
				role="status"
				aria-live="polite"
				aria-label={`Paperclip says: ${hint.content}`}
				align="flex-end"
				gap={3}
				mb={4}
				style={{ animation: "hint-appear 0.3s ease-out" }}
				{...containerProps}
			>
				<PaperclipCharacter pose={pose} />

				<Box position="relative" flex="1" maxW="lg">
					{/* Bubble tail pointing at the character */}
					<Box
						position="absolute"
						left="-6px"
						bottom="12px"
						w="0"
						h="0"
						borderTop="6px solid transparent"
						borderBottom="6px solid transparent"
						borderRight="6px solid"
						borderRightColor="gray.800"
					/>

					{/* Bubble */}
					<Box
						bg="gray.800"
						border="1px solid"
						borderColor="blue.800"
						borderRadius="lg"
						borderBottomLeftRadius="xs"
						px={4}
						py={2.5}
					>
						<Text
							fontSize="xs"
							fontWeight="bold"
							color="blue.400"
							letterSpacing="wide"
							mb={0.5}
						>
							Paperclip
						</Text>
						<Text fontSize="sm" color="gray.100" lineHeight="short">
							{hint.content}
						</Text>
					</Box>
				</Box>
			</Flex>
		</>
	);
};
