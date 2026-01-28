import type { TerminalCommandHelpers } from "@/components/game/engines";
import type {
	PuzzleConfig,
	GamePhase,
	InventoryGroupConfig,
	PlacedItem,
	QuestionStatus,
	TerminalState,
} from "@/components/game/game-provider";

export type QuestionSpec<ConditionKey extends string = string> = {
	meta: Meta;
	init: InitSpec;
	phaseRules: PhaseRule<ConditionKey>[];
	inventoryRules?: InventoryRule<ConditionKey>[];
	canvasRules?: CanvasRule<ConditionKey>[];
	labels: Labels;
	handlers: Handlers;
};

export type Meta = {
	id: string;
	title: string;
	description: string;
};

export type InitSpec = { kind: "multi"; payload: MultiInitPayload };

export type MultiInitPayload = {
	questionId: string;
	canvases: Record<string, PuzzleConfig>;
	inventoryGroups?: InventoryGroupConfig[];
	terminal?: Partial<TerminalState>;
	phase?: GamePhase;
	questionStatus?: QuestionStatus;
};

export type PhaseRule<ConditionKey extends string = string> =
	| { kind: "set"; when: Condition<ConditionKey>; to: GamePhase }
	| { kind: "retain"; when: Condition<ConditionKey> };

export type InventoryRule<ConditionKey extends string = string> =
	| { kind: "show-group"; when: Condition<ConditionKey>; groupId: string }
	| { kind: "hide-group"; when: Condition<ConditionKey>; groupId: string };

export type CanvasRule<ConditionKey extends string = string> =
	| { kind: "show"; when: Condition<ConditionKey>; puzzleId: string }
	| { kind: "hide"; when: Condition<ConditionKey>; puzzleId: string };

export type Labels = {
	getItemLabel: (itemType: string) => string;
	getStatusMessage: (item: PlacedItem) => string | null;
};

export type Handlers = {
	onCommand: (input: string, helpers: TerminalCommandHelpers) => void;
	onItemClickByType: Record<string, (args: { item: PlacedItem }) => void>;
	isItemClickableByType: Record<string, boolean>;
};

export type Condition<ConditionKey extends string = string> =
	| { kind: "and"; all: Condition<ConditionKey>[] }
	| { kind: "or"; any: Condition<ConditionKey>[] }
	| { kind: "not"; value: Condition<ConditionKey> }
	| { kind: "flag"; key: ConditionKey; is: boolean }
	| {
			kind: "eq";
			key: ConditionKey;
			value: string | number | boolean | null;
	  }
	| { kind: "in"; key: ConditionKey; values: Array<string | number> };

export type ConditionContext<ConditionKey extends string = string> = Record<
	ConditionKey,
	string | number | boolean | null | undefined
>;

export type PhaseResolution = {
	nextPhase: GamePhase;
	shouldRetain: boolean;
};

export const evaluateCondition = <ConditionKey extends string>(
	condition: Condition<ConditionKey>,
	context: ConditionContext<ConditionKey>,
): boolean => {
	switch (condition.kind) {
		case "and":
			return condition.all.every((entry) => evaluateCondition(entry, context));
		case "or":
			return condition.any.some((entry) => evaluateCondition(entry, context));
		case "not":
			return !evaluateCondition(condition.value, context);
		case "flag":
			return Boolean(context[condition.key]) === condition.is;
		case "eq":
			return context[condition.key] === condition.value;
		case "in": {
			const value = context[condition.key];
			if (value === undefined || value === null) {
				return false;
			}
			return condition.values.includes(value as string | number);
		}
		default:
			return false;
	}
};

export const resolvePhase = <ConditionKey extends string>(
	rules: PhaseRule<ConditionKey>[],
	context: ConditionContext<ConditionKey>,
	currentPhase: GamePhase,
	fallbackPhase: GamePhase,
): PhaseResolution => {
	let nextPhase = fallbackPhase;

	for (const rule of rules) {
		if (!evaluateCondition(rule.when, context)) {
			continue;
		}

		if (rule.kind === "retain") {
			return { nextPhase: currentPhase, shouldRetain: true };
		}

		nextPhase = rule.to;
	}

	return { nextPhase, shouldRetain: false };
};

export const resolveVisibility = <ConditionKey extends string>(
	rules: Array<InventoryRule<ConditionKey> | CanvasRule<ConditionKey>>,
	context: ConditionContext<ConditionKey>,
	key: string,
	current: boolean,
): boolean => {
	let next = current;

	for (const rule of rules) {
		const matchesKey =
			"groupId" in rule ? rule.groupId === key : rule.puzzleId === key;
		if (!matchesKey) {
			continue;
		}

		if (!evaluateCondition(rule.when, context)) {
			continue;
		}

		next = rule.kind === "show-group" || rule.kind === "show";
	}

	return next;
};
