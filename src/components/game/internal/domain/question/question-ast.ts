import type {
	Condition,
	ConditionContext,
	InventoryRule,
	PhaseResolution,
	PhaseRule,
	SpaceRule,
} from "@/components/game/types/question";

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
			if (typeof value !== "string" && typeof value !== "number") {
				return false;
			}
			return condition.values.includes(value);
		}
		default:
			return false;
	}
};

export const resolvePhase = <ConditionKey extends string>(
	rules: PhaseRule<ConditionKey>[],
	context: ConditionContext<ConditionKey>,
	currentPhase: string,
	fallbackPhase: string,
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
	rules: Array<InventoryRule<ConditionKey> | SpaceRule<ConditionKey>>,
	context: ConditionContext<ConditionKey>,
	key: string,
	current: boolean,
): boolean => {
	let next = current;

	for (const rule of rules) {
		const matchesKey =
			"groupId" in rule ? rule.groupId === key : rule.spaceId === key;
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
