import type { BehaviorDefinition } from "@/components/game/runtime";

type UdpBehaviorContext = Record<string, never>;

export const UDP_BEHAVIORS: BehaviorDefinition<UdpBehaviorContext> = {
	initialContext: {} as UdpBehaviorContext,
	rules: [],
};
