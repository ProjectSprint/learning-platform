import type { BehaviorDefinition } from "@/components/game/runtime";

type TcpBehaviorContext = Record<string, never>;

export const TCP_BEHAVIORS: BehaviorDefinition<TcpBehaviorContext> = {
	initialContext: {} as TcpBehaviorContext,
	rules: [],
};
