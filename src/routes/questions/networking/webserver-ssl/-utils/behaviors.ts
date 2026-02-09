import type {
	BehaviorDefinition,
	BehaviorRule,
} from "@/components/game/runtime";
import { modalSubmitted } from "@/components/game/runtime";

type SslBehaviorContext = {
	certificateDomain: string | null;
};

const rules: BehaviorRule<SslBehaviorContext>[] = [
	{
		id: "ssl.certificate-issue",
		on: modalSubmitted(undefined, "issue"),
		guard: ({ event }) =>
			event.type === "MODAL_SUBMITTED" &&
			event.modalId.startsWith("certificate-request-"),
		handler: ({ event, world, updateContext }) => {
			if (event.type !== "MODAL_SUBMITTED") return;
			const deviceId = event.modalId.replace("certificate-request-", "");
			const domain = String(event.values.domain ?? "").trim();

			if (domain) {
				world.updateEntity(deviceId, {
					data: {
						certificateIssued: true,
						verified: true,
						certificateDomain: domain,
					},
				});

				updateContext((ctx) => {
					ctx.certificateDomain = domain;
				});
			}
		},
	},
];

export type { SslBehaviorContext };

export const SSL_BEHAVIORS: BehaviorDefinition<SslBehaviorContext> = {
	initialContext: { certificateDomain: null },
	rules,
};
