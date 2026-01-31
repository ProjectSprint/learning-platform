/**
 * Compatibility hooks for old components.
 * These hooks wrap the new state with the old format.
 */

import { useMemo } from "react";
import { useGameState } from "../../game-provider";
import { getAllPuzzles } from "./state-conversion";

/**
 * Legacy hook that returns all puzzles.
 * @deprecated Use useSpaces() instead
 */
export function useAllPuzzles() {
	const state = useGameState();
	return useMemo(
		() => getAllPuzzles(state.spaces, state.entities),
		[state.spaces, state.entities],
	);
}
