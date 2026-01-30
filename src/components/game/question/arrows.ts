import type { Dispatch } from "react";
import type { Arrow, GameAction } from "@/components/game/game-provider";

export const setBoardArrows = (
	dispatch: Dispatch<GameAction>,
	arrows: Arrow[],
) => {
	dispatch({ type: "SET_ARROWS", payload: { arrows } });
};

export const clearBoardArrows = (dispatch: Dispatch<GameAction>) => {
	dispatch({ type: "CLEAR_ARROWS" });
};
