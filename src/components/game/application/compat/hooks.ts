/**
 * Compatibility hooks for old components.
 * These hooks wrap the new state with the old format.
 */

import { useMemo } from "react";
import { useGameState } from "../../game-provider";
import { getAllSpaces } from "./state-conversion";

/**
 * Legacy hook that returns all spaces.
 * @deprecated Use useSpaces() instead
 */
export function useAllSpaces() {
	const state = useGameState();
	return useMemo(
		() => getAllSpaces(state.spaces, state.entities),
		[state.spaces, state.entities],
	);
}
