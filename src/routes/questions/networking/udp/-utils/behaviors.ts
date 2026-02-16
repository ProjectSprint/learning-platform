import type { EntityEnteredSpaceEvent } from "@/components/game/engine/application/state/types/events";
import type {
	BehaviorDefinition,
	BehaviorRule,
} from "@/components/game/engine/runtime";
import {
	modalSubmitted,
	whenEntityPlacedInSpace,
} from "@/components/game/engine/runtime";
import type { UdpClientId } from "./constants";
import { UDP_CLIENT_IDS } from "./constants";
import { getFrameDestiny, TOTAL_FRAMES } from "./frame-destiny";
import { buildUdpSuccessModal } from "./modal-builders";

const FRAME_SEND_MS = 1500;
const REJECT_MS = 400;
const NOTICE_MS = 2000;

export type UdpBehaviorContext = {
	navigateAway: boolean;
	udpPhase: "intro" | "streaming" | "complete";
	lastSentFrame: number;
	noticeMessage: string | null;
	noticeTone: "error" | "info" | null;
	clientFramesA: string;
	clientFramesB: string;
	clientFramesC: string;
};

const INITIAL_CLIENT_FRAMES = "0".repeat(TOTAL_FRAMES);

const getClientFramesKey = (
	clientId: UdpClientId,
): keyof Pick<
	UdpBehaviorContext,
	"clientFramesA" | "clientFramesB" | "clientFramesC"
> => {
	switch (clientId) {
		case "a":
			return "clientFramesA";
		case "b":
			return "clientFramesB";
		case "c":
			return "clientFramesC";
	}
};

const rules: BehaviorRule<UdpBehaviorContext>[] = [
	{
		id: "udp.frame-entered-internet",
		on: whenEntityPlacedInSpace("internet", "frame"),
		guard: ({ context }) => context.udpPhase === "streaming",
		handler: (ctx) => {
			const { event, entity, world, context, updateContext, schedule } = ctx;
			if (!entity) return;
			const e = event as EntityEnteredSpaceEvent;
			const entityId = e.entityId;
			const frameNumber =
				typeof entity.data?.frameNumber === "number"
					? entity.data.frameNumber
					: 0;
			const expectedFrame = context.lastSentFrame + 1;

			if (frameNumber !== expectedFrame) {
				world.updateEntity(entityId, {
					data: { status: "error", state: "rejected" },
				});
				updateContext((c) => {
					c.noticeMessage = `Send Frame ${expectedFrame} first.`;
					c.noticeTone = "error";
				});
				schedule(`udp:reject:${entityId}`, REJECT_MS, (sCtx) => {
					sCtx.world.removeFromSpace(entityId, "internet");
				});
				schedule("udp:notice-clear", NOTICE_MS, (sCtx) => {
					sCtx.updateContext((c) => {
						c.noticeMessage = null;
						c.noticeTone = null;
					});
				});
				return;
			}

			world.updateEntity(entityId, {
				data: { status: "warning", state: "sending" },
			});

			schedule(`udp:send:${entityId}`, FRAME_SEND_MS, (sCtx) => {
				sCtx.world.removeFromSpace(entityId, "internet");

				sCtx.updateContext((c) => {
					c.lastSentFrame = frameNumber;

					for (const clientId of UDP_CLIENT_IDS) {
						const key = getClientFramesKey(clientId);
						const frames = c[key].split("");
						frames[frameNumber - 1] =
							getFrameDestiny(frameNumber, clientId) === "delivered"
								? "1"
								: "0";
						c[key] = frames.join("");
					}

					if (frameNumber >= TOTAL_FRAMES) {
						c.udpPhase = "complete";
					}
				});

				if (frameNumber >= TOTAL_FRAMES) {
					sCtx.interaction.openModal(buildUdpSuccessModal());
					sCtx.progress.completeQuestion();
				}
			});
		},
	},
	{
		id: "udp.success-navigate",
		on: modalSubmitted("udp-success", "complete"),
		handler: ({ updateContext }) => {
			updateContext((ctx) => {
				ctx.navigateAway = true;
			});
		},
	},
];

export const UDP_BEHAVIORS: BehaviorDefinition<UdpBehaviorContext> = {
	initialContext: {
		navigateAway: false,
		udpPhase: "streaming",
		lastSentFrame: 0,
		noticeMessage: null,
		noticeTone: null,
		clientFramesA: INITIAL_CLIENT_FRAMES,
		clientFramesB: INITIAL_CLIENT_FRAMES,
		clientFramesC: INITIAL_CLIENT_FRAMES,
	},
	rules,
};
