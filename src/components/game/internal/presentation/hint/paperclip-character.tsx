import { Box } from "@chakra-ui/react";
import { gsap } from "gsap";
import { useEffect, useRef } from "react";
import { ensureSvgPlugins } from "@/lib/gsap-plugins";
import { POSE_PATHS } from "./paperclip-paths";

type PaperclipPose = keyof typeof POSE_PATHS;

type PaperclipCharacterProps = {
	pose: PaperclipPose;
};

/** Eye expression tweaks per pose */
const EYE_EXPRESSIONS: Record<
	PaperclipPose,
	{ scaleX: number; scaleY: number; pupilY: number }
> = {
	idle: { scaleX: 1, scaleY: 1, pupilY: 0 },
	idea: { scaleX: 1.15, scaleY: 1.15, pupilY: -1 },
	success: { scaleX: 1, scaleY: 0.7, pupilY: 0 },
	error: { scaleX: 1.2, scaleY: 1.2, pupilY: 0.5 },
	warning: { scaleX: 1, scaleY: 0.85, pupilY: -0.5 },
};

export const PaperclipCharacter = ({ pose }: PaperclipCharacterProps) => {
	const wireRef = useRef<SVGPathElement>(null);
	const eyesRef = useRef<SVGGElement>(null);
	const leftPupilRef = useRef<SVGCircleElement>(null);
	const rightPupilRef = useRef<SVGCircleElement>(null);
	const containerRef = useRef<SVGSVGElement>(null);

	// Mount: draw-in + idle loop
	// Uses gsap.context() so revert() properly clears inline styles on
	// React strict-mode double-mount (prevents drawSVG stuck at 0%).
	useEffect(() => {
		ensureSvgPlugins();

		const wire = wireRef.current;
		const eyes = eyesRef.current;
		const container = containerRef.current;
		if (!wire || !eyes || !container) return;

		const ctx = gsap.context(() => {
			// Entrance: wire draws itself in, then eyes fade in
			const entrance = gsap.timeline();
			entrance
				.set(eyes, { opacity: 0 })
				.fromTo(
					wire,
					{ drawSVG: "0%" },
					{ drawSVG: "100%", duration: 1.2, ease: "power2.inOut" },
				)
				.to(eyes, { opacity: 1, duration: 0.3, ease: "power2.out" });

			// Idle loop: wobble + periodic blink
			gsap
				.timeline({ repeat: -1, delay: 1.5 })
				// Gentle wobble
				.to(container, {
					rotation: -3,
					y: -1,
					duration: 1.5,
					ease: "sine.inOut",
					transformOrigin: "50% 50%",
				})
				.to(container, {
					rotation: 3,
					y: 1,
					duration: 1.5,
					ease: "sine.inOut",
				})
				.to(container, {
					rotation: 0,
					y: 0,
					duration: 1,
					ease: "sine.inOut",
				})
				// Blink
				.to(
					eyes,
					{
						scaleY: 0.1,
						duration: 0.08,
						transformOrigin: "50% 50%",
						yoyo: true,
						repeat: 1,
					},
					">-0.5",
				);
		});

		return () => ctx.revert();
	}, []);

	// Pose change: morph wire + adjust eyes
	useEffect(() => {
		const wire = wireRef.current;
		const leftPupil = leftPupilRef.current;
		const rightPupil = rightPupilRef.current;
		const eyes = eyesRef.current;
		if (!wire || !eyes) return;

		gsap.killTweensOf(wire, "morphSVG");

		gsap.to(wire, {
			morphSVG: POSE_PATHS[pose],
			duration: 0.6,
			ease: "power2.inOut",
		});

		const expr = EYE_EXPRESSIONS[pose];
		gsap.to(eyes, {
			scaleX: expr.scaleX,
			scaleY: expr.scaleY,
			duration: 0.4,
			ease: "power2.out",
			transformOrigin: "50% 50%",
		});

		if (leftPupil && rightPupil) {
			gsap.to([leftPupil, rightPupil], {
				y: expr.pupilY,
				duration: 0.3,
				ease: "power2.out",
			});
		}
	}, [pose]);

	return (
		<Box
			flexShrink={0}
			w={{ base: "36px", md: "44px" }}
			h={{ base: "52px", md: "64px" }}
			aria-hidden="true"
		>
			<svg
				ref={containerRef}
				viewBox="0 0 64 80"
				width="100%"
				height="100%"
				role="img"
				aria-label="Paperclip character"
			>
				{/* Morphing wire body */}
				<path
					ref={wireRef}
					d={POSE_PATHS.idle}
					fill="none"
					stroke="#60a5fa"
					strokeWidth="3.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>

				{/* Eyes */}
				<g ref={eyesRef}>
					{/* Left eye */}
					<circle cx="26" cy="18" r="5" fill="white" />
					<circle cx="26" cy="18" r="3" fill="#1e293b" />
					<circle ref={leftPupilRef} cx="27" cy="17" r="1.2" fill="white" />

					{/* Right eye */}
					<circle cx="38" cy="18" r="5" fill="white" />
					<circle cx="38" cy="18" r="3" fill="#1e293b" />
					<circle ref={rightPupilRef} cx="39" cy="17" r="1.2" fill="white" />
				</g>
			</svg>
		</Box>
	);
};
