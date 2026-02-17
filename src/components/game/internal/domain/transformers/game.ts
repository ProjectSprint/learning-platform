import type {
	GameEventInput,
	QuestionStatus,
} from "@/components/game/types/state";
import type { TransitionResult } from "@/components/game/types/transformer";
import { transitionApplied, transitionNoop } from "./types";

type GameStateSlice = {
	phase: string;
	question: { id: string; status: QuestionStatus };
	eventQueue: { lastEventId: number };
	eventCursors: Record<string, number>;
};

type GameTransitionEvent = {
	type: "PHASE_CHANGED";
	from: string;
	to: string;
};

type GameTransitionPayload = {
	events: GameTransitionEvent[];
};

type CoreTransitionPayload = {
	events: GameEventInput[];
};

export const trySetQuestion = (
	state: GameStateSlice,
	input: { id: string; status?: QuestionStatus },
): TransitionResult<GameTransitionPayload> => {
	if (
		state.question.id === input.id &&
		(input.status === undefined || state.question.status === input.status)
	) {
		return transitionNoop(`question:${input.id}:no_changes`);
	}

	state.question = {
		id: input.id,
		status: input.status ?? state.question.status,
	};
	return transitionApplied({ events: [] });
};

export const trySetPhase = (
	state: GameStateSlice,
	input: { phase: string },
): TransitionResult<CoreTransitionPayload> => {
	if (state.phase === input.phase) {
		return transitionNoop(`phase:${input.phase}:already_active`);
	}

	const previous = state.phase;
	state.phase = input.phase;
	return transitionApplied({
		events: [
			{
				type: "PHASE_CHANGED",
				from: previous,
				to: input.phase,
			},
		],
	});
};

export const applyCompleteQuestion = (
	state: GameStateSlice,
): TransitionResult<GameTransitionPayload> => {
	if (state.question.status === "completed") {
		return transitionNoop("question:already_completed");
	}
	state.question = {
		...state.question,
		status: "completed",
	};
	return transitionApplied({ events: [] });
};

export const tryAckEvents = (
	state: GameStateSlice,
	input: { engineId: string; cursor: number },
): TransitionResult<GameTransitionPayload> => {
	const nextCursor = Math.min(input.cursor, state.eventQueue.lastEventId);
	const currentCursor = state.eventCursors[input.engineId] ?? 0;
	if (nextCursor <= currentCursor) {
		return transitionNoop(`ack:${input.engineId}:cursor_not_advanced`);
	}
	state.eventCursors[input.engineId] = nextCursor;
	return transitionApplied({ events: [] });
};

export const tryEmitEvents = (
	_events: GameEventInput[],
): TransitionResult<{ events: GameEventInput[] }> => {
	if (_events.length === 0) {
		return transitionNoop("events:empty_payload");
	}
	return transitionApplied({ events: _events });
};
