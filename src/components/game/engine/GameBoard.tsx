/**
 * GameBoard component - Top-level wrapper for game spaces.
 *
 * Provides BoardRegistryProvider (for arrow registration)
 * and BoardArrowSurface context for arrow visualization between spaces.
 *
 * @example
 * ```tsx
 * <GameBoard>
 *   <GridSpace id="router" />
 *   <GridSpace id="server" />
 *   <PoolSpace />
 * </GameBoard>
 * ```
 */

import type { ReactNode } from "react";
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
 * - BoardArrowSurface: Provides board registry and arrow layer
 *
 * All GridSpace and PoolSpace components should be children of GameBoard.
 * DragProvider is mounted at GameProvider level to support drawer overlays.
 */
export const GameBoard = ({ children }: GameBoardProps) => {
	return (
		<BoardRegistryProvider>
			<BoardArrowSurface>{children}</BoardArrowSurface>
		</BoardRegistryProvider>
	);
};
