import { buildModalSubmitTrigger } from "@/components/game/engine/runtime";
import type {
	BehaviorDefinition,
	BehaviorRule,
} from "@/components/game/types/behavior";

export type TcpBehaviorContext = {
	navigateAway: boolean;
};

const rules: BehaviorRule<TcpBehaviorContext>[] = [
	{
		id: "tcp.success-modal-navigate",
		on: buildModalSubmitTrigger("tcp-success", "primary"),
		handler: ({ updateContext }) => {
			updateContext((ctx) => {
				ctx.navigateAway = true;
			});
		},
	},
];

export const TCP_BEHAVIORS: BehaviorDefinition<TcpBehaviorContext> = {
	initialContext: { navigateAway: false },
	rules,
};
