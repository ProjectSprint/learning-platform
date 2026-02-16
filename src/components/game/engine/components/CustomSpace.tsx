/**
 * CustomSpace component - Display-only container for question-specific UI.
 *
 * Registers with BoardRegistry so arrows can target it. Does NOT manage
 * entity storage or drag-drop — rendering is fully controlled by children.
 */

import { Box } from "@chakra-ui/react";
import { memo, useCallback } from "react";
import type { CustomSpaceData } from "@/components/game/types/space";
import { useGameState } from "../../internal/game-provider";
import { useBoardRegistry } from "../../internal/presentation/space/arrow";

type CustomSpaceProps = {
	/** Space ID — must match a custom space defined in QuestionDefinition */
	id: string;
	/** Content to render inside the custom space */
	children: React.ReactNode;
};

export const CustomSpace = memo(({ id, children }: CustomSpaceProps) => {
	const state = useGameState();
	const { registerBoard } = useBoardRegistry();
	const space = state.spaces[id] as CustomSpaceData | undefined;

	const callbackRef = useCallback(
		(node: HTMLDivElement | null) => {
			registerBoard(id, node);
		},
		[id, registerBoard],
	);

	if (!space || space.kind !== "custom") {
		if (process.env.NODE_ENV === "development") {
			console.warn(
				`[CustomSpace] Space "${id}" not found or not a custom space.`,
			);
		}
		return null;
	}

	return (
		<Box ref={callbackRef} data-space-id={id}>
			{children}
		</Box>
	);
});

CustomSpace.displayName = "CustomSpace";
