import type { Dispatch } from "react";
import type {
	Arrow,
	ArrowAnchor,
	GameAction,
} from "@/components/game/game-provider";

export type ArrowAnchorOverride = {
	from?: ArrowAnchor;
	to?: ArrowAnchor;
};

export const applyArrowAnchors = (
	arrows: Arrow[],
	overrides: Record<string, ArrowAnchorOverride>,
) =>
	arrows.map((arrow) => {
		const override = overrides[arrow.id];
		if (!override) {
			return arrow;
		}

		return {
			...arrow,
			from: {
				...arrow.from,
				anchor: override.from ?? arrow.from.anchor,
			},
			to: {
				...arrow.to,
				anchor: override.to ?? arrow.to.anchor,
			},
		};
	});

export const setBoardArrows = (
	dispatch: Dispatch<GameAction>,
	arrows: Arrow[],
) => {
	dispatch({ type: "SET_ARROWS", payload: { arrows } });
};

export const clearBoardArrows = (dispatch: Dispatch<GameAction>) => {
	dispatch({ type: "CLEAR_ARROWS" });
};
