import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { DragOverlay, DragProvider } from "../drag";
import { OverlayLayer } from "../modal/overlay-layer";

type GameShellProps = {
	children: ReactNode;
	getItemLabel?: (itemType: string) => string;
};

export const GameShell = ({ children, getItemLabel }: GameShellProps) => {
	return (
		<DragProvider>
			<Box
				as="main"
				role="main"
				display="flex"
				flexDirection="column"
				bg="gray.950"
				color="gray.100"
				position="relative"
			>
				{children}
				<OverlayLayer />
				<DragOverlay getItemLabel={getItemLabel} />
			</Box>
		</DragProvider>
	);
};
