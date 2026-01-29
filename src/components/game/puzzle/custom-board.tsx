import { Box, type BoxProps } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useBoardRegistry } from "./board/arrow";

type CustomBoardProps = BoxProps & {
	puzzleId: string;
	children: ReactNode;
};

export const CustomBoard = ({
	puzzleId,
	children,
	...boxProps
}: CustomBoardProps) => {
	const { registerBoard } = useBoardRegistry();
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		registerBoard(puzzleId, containerRef.current);
		return () => {
			registerBoard(puzzleId, null);
		};
	}, [puzzleId, registerBoard]);

	return (
		<Box ref={containerRef} {...boxProps}>
			{children}
		</Box>
	);
};
