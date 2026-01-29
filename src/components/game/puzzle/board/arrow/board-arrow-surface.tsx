import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { ArrowLayer } from "./arrow-layer";
import { useBoardRegistry } from "./board-registry";

type BoardArrowSurfaceProps = {
	children: ReactNode;
};

export const BoardArrowSurface = ({ children }: BoardArrowSurfaceProps) => {
	const { containerRef } = useBoardRegistry();

	return (
		<Box ref={containerRef} position="relative">
			<ArrowLayer />
			<Box position="relative" zIndex={1}>
				{children}
			</Box>
		</Box>
	);
};
