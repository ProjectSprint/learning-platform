import type {
	BehaviorDefinition,
	BehaviorRule,
} from "@/components/game/runtime";
import { modalSubmitted } from "@/components/game/runtime";

export type TcpBehaviorContext = {
	navigateAway: boolean;
};

const rules: BehaviorRule<TcpBehaviorContext>[] = [
	{
		id: "tcp.success-modal-navigate",
		on: modalSubmitted("tcp-success", "primary"),
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
