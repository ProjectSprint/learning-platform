import type { BehaviorDefinition } from "@/components/game/runtime";

type InternetBehaviorContext = Record<string, never>;

export const INTERNET_BEHAVIORS: BehaviorDefinition<InternetBehaviorContext> = {
	initialContext: {} as InternetBehaviorContext,
	rules: [],
};
