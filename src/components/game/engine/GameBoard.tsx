/**
 * GameBoard component - Top-level wrapper for game spaces.
 *
 * Provides BoardRegistryProvider (for arrow registration), DragProvider,
 * and BoardArrowSurface context for arrow visualization between spaces.
 *
 * @example
 * ```tsx
 * <GameBoard>
 *   <GridSpace spaceId="router" />
 *   <GridSpace spaceId="server" />
 *   <PoolSpace />
 * </GameBoard>
 * ```
 */

import type { ReactNode } from "react";
import { DragProvider } from "../presentation/interaction/drag/DragContext";
import {
	BoardArrowSurface,
	BoardRegistryProvider,
} from "../presentation/space/arrow";

export type GameBoardProps = {
	children: ReactNode;
};

/**
 * GameBoard - Wrapper component providing drag and arrow context.
 *
 * Wraps:
 * - DragProvider: Provides drag-drop state context
 * - BoardArrowSurface: Provides board registry and arrow layer
 *
 * All GridSpace and PoolSpace components should be children of GameBoard.
 */
export const GameBoard = ({ children }: GameBoardProps) => {
	return (
		<BoardRegistryProvider>
			<DragProvider>
				<BoardArrowSurface>{children}</BoardArrowSurface>
			</DragProvider>
		</BoardRegistryProvider>
	);
};
