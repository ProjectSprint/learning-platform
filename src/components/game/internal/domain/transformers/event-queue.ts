export type EventBase = {
	eventId: number;
	actionId: number;
	timestamp?: number;
};

export type EventQueue<TEvent extends EventBase> = {
	events: TEvent[];
	lastEventId: number;
	lastActionId: number;
};

export type EventInput<TEvent extends EventBase> = Omit<
	TEvent,
	"eventId" | "actionId" | "timestamp"
>;

const ensureQueue = <TEvent extends EventBase>(
	queue?: EventQueue<TEvent>,
): EventQueue<TEvent> => {
	if (queue) {
		return queue;
	}
	return {
		events: [],
		lastActionId: 0,
		lastEventId: 0,
	};
};

export const getNextActionId = <TEvent extends EventBase>(
	queue?: EventQueue<TEvent>,
): number => {
	const safeQueue = ensureQueue(queue);
	return safeQueue.lastActionId + 1;
};

export const applyAppendEvents = <TEvent extends EventBase>(
	queue: EventQueue<TEvent> | undefined,
	actionId: number,
	inputs: EventInput<TEvent>[],
): EventQueue<TEvent> => {
	const safeQueue = ensureQueue(queue);
	if (inputs.length === 0) {
		return safeQueue;
	}

	let nextEventId = safeQueue.lastEventId;
	const nextEvents = inputs.map((input) => {
		nextEventId += 1;
		return {
			...input,
			actionId,
			eventId: nextEventId,
		} as TEvent;
	});

	return {
		events: [...safeQueue.events, ...nextEvents],
		lastActionId: actionId,
		lastEventId: nextEventId,
	};
};
