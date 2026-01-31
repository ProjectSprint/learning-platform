import { Box, Container, Heading, Text, VStack } from "@chakra-ui/react";
import { Icon } from "@iconify/react";
import { gsap } from "gsap";
import { useCallback, useEffect, useId, useRef, useState } from "react";

// Configuration
const LOADING_DURATION = 1.5;
const RESULT_PAUSE = 1;
const MOVE_DURATION = 0.8;
const COMPUTER_WIDTH = 140;
const COMPUTER_GAP = 40;

// Inner icon configuration (adjustable for different icons)
const INNER_ICON = "ri:ai";
const INNER_ICON_SIZE = 40;
const INNER_ICON_TOP = 35;
const INNER_ICON_LEFT = "50%"; // Use "50%" for centered, or pixel value like "30px"
const INNER_ICON_COLOR = "1c1c1c";
const BadgeLoadingIcon = () => (
	<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
		<circle cx="6" cy="12" r="2" fill="white" />
		<circle cx="12" cy="12" r="2" fill="white" />
		<circle cx="18" cy="12" r="2" fill="white" />
	</svg>
);

const BadgeAcceptIcon = () => (
	<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
		<path
			d="M6 12l4 4 8-8"
			fill="none"
			stroke="white"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

const BadgeRejectIcon = () => (
	<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
		<path
			d="M7 7l10 10M17 7l-10 10"
			fill="none"
			stroke="white"
			strokeWidth="2.5"
			strokeLinecap="round"
		/>
	</svg>
);

// 2:1 accept ratio pattern
const getResult = (index: number): "accept" | "reject" => {
	const pattern = index % 3;
	return pattern < 2 ? "accept" : "reject";
};

// Person with magnifying glass SVG
const PersonWithMagnifier = () => (
	<g>
		{/* Body */}
		<rect x="15" y="45" width="30" height="40" rx="6" fill="#3B82F6" />

		{/* Head */}
		<circle cx="30" cy="25" r="18" fill="#FECACA" />

		{/* Hair */}
		<path
			d="M12 20 Q12 5 30 5 Q48 5 48 20 L48 15 Q48 2 30 2 Q12 2 12 15 Z"
			fill="#92400E"
		/>

		{/* Eyes */}
		<circle cx="24" cy="24" r="2" fill="#1F2937" />
		<circle cx="36" cy="24" r="2" fill="#1F2937" />

		{/* Smile */}
		<path
			d="M24 32 Q30 38 36 32"
			stroke="#1F2937"
			strokeWidth="2"
			fill="none"
			strokeLinecap="round"
		/>

		{/* Arm holding magnifier */}
		<g>
			{/* Upper arm */}
			<rect x="45" y="50" width="25" height="10" rx="4" fill="#FECACA" />

			{/* Magnifying glass */}
			<g transform="translate(65, 35)">
				{/* Glass circle */}
				<circle
					cx="15"
					cy="15"
					r="18"
					fill="none"
					stroke="#64748B"
					strokeWidth="5"
				/>
				<circle cx="15" cy="15" r="14" fill="#E0F2FE" fillOpacity="0.6" />

				{/* Handle */}
				<rect
					x="28"
					y="28"
					width="8"
					height="25"
					rx="3"
					fill="#92400E"
					transform="rotate(45, 28, 28)"
				/>

				{/* Shine on glass */}
				<path
					d="M8 8 Q12 4 18 6"
					stroke="white"
					strokeWidth="2"
					fill="none"
					strokeLinecap="round"
				/>
			</g>
		</g>

		{/* Legs */}
		<rect x="20" y="85" width="10" height="25" rx="4" fill="#1E40AF" />
		<rect x="32" y="85" width="10" height="25" rx="4" fill="#1E40AF" />

		{/* Feet */}
		<rect x="18" y="107" width="14" height="6" rx="2" fill="#1F2937" />
		<rect x="30" y="107" width="14" height="6" rx="2" fill="#1F2937" />
	</g>
);

type ComputerState = "waiting" | "loading" | "accept" | "reject";

interface ComputerItemProps {
	id: number;
	state: ComputerState;
}

function ComputerItem({ state }: ComputerItemProps) {
	const badgeRef = useRef<HTMLDivElement>(null);
	const currentIconRef = useRef<HTMLDivElement>(null);
	const nextIconRef = useRef<HTMLDivElement>(null);
	const [currentState, setCurrentState] = useState<ComputerState>(state);
	const [nextState, setNextState] = useState<ComputerState | null>(null);
	const currentStateRef = useRef<ComputerState>(state);
	const pendingStateRef = useRef<ComputerState | null>(null);
	const isAnimatingRef = useRef(false);
	const debugRef = useRef<HTMLDivElement>(null);
	const stateRef = useRef(state);
	const nextStateRef = useRef<ComputerState | null>(nextState);
	const startTransitionRef = useRef<(target: ComputerState) => void>(() => {});

	const updateDebug = useCallback((label: string) => {
		const el = debugRef.current;
		if (!el) return;
		const badge = badgeRef.current;
		const currentEl = currentIconRef.current;
		const nextEl = nextIconRef.current;
		const badgeOpacity = badge ? window.getComputedStyle(badge).opacity : "n/a";
		const badgeVisibility = badge
			? window.getComputedStyle(badge).visibility
			: "n/a";
		const currentOpacity = currentEl
			? window.getComputedStyle(currentEl).opacity
			: "n/a";
		const nextOpacity = nextEl
			? window.getComputedStyle(nextEl).opacity
			: "n/a";

		el.textContent = `${label}
state prop: ${stateRef.current}
current: ${currentStateRef.current}
next: ${nextStateRef.current ?? "null"}
badge opacity: ${badgeOpacity}, visibility: ${badgeVisibility}
current opacity: ${currentOpacity}, next opacity: ${nextOpacity}`;
	}, []);

	const setCurrentStateSafe = useCallback((next: ComputerState) => {
		currentStateRef.current = next;
		setCurrentState(next);
	}, []);

	const getBadgeColor = (badgeState: ComputerState | null) => {
		switch (badgeState) {
			case "loading":
				return "#F59E0B";
			case "accept":
				return "#22C55E";
			case "reject":
				return "#EF4444";
			default:
				return "transparent";
		}
	};

	const finishTransition = useCallback(() => {
		isAnimatingRef.current = false;
		updateDebug("finish");
		const pending = pendingStateRef.current;
		if (pending && pending !== currentStateRef.current) {
			startTransitionRef.current(pending);
		}
	}, [updateDebug]);

	const startTransition = useCallback(
		(target: ComputerState) => {
			const badgeEl = badgeRef.current;
			const currentEl = currentIconRef.current;
			if (!badgeEl || !currentEl) {
				setCurrentStateSafe(target);
				setNextState(null);
				finishTransition();
				return;
			}

			const prevState = currentStateRef.current;
			if (prevState === target) {
				updateDebug("noop");
				finishTransition();
				return;
			}

			isAnimatingRef.current = true;
			gsap.killTweensOf([badgeEl, currentEl, nextIconRef.current]);

			if (target === "waiting") {
				const tl = gsap.timeline({
					onComplete: () => {
						setNextState(null);
						setCurrentStateSafe(target);
						updateDebug("to waiting done");
						finishTransition();
					},
				});
				tl.to(currentEl, { opacity: 0, duration: 0.1 });
				tl.to(
					badgeEl,
					{ opacity: 0, scale: 0, duration: 0.2, ease: "power1.in" },
					"<",
				);
				return;
			}

			updateDebug("set next");
			setNextState(target);
		},
		[finishTransition, setCurrentStateSafe, updateDebug],
	);

	useEffect(() => {
		startTransitionRef.current = startTransition;
	}, [startTransition]);

	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	useEffect(() => {
		nextStateRef.current = nextState;
	}, [nextState]);

	useEffect(() => {
		pendingStateRef.current = state;
		updateDebug("prop change");
		if (state === "loading") {
			isAnimatingRef.current = false;
			startTransition(state);
			return;
		}
		if (!isAnimatingRef.current) {
			startTransition(state);
		}
	}, [state, startTransition, updateDebug]);

	useEffect(() => {
		const badgeEl = badgeRef.current;
		const currentEl = currentIconRef.current;
		if (!badgeEl || !currentEl) return;

		if (currentStateRef.current === "waiting") {
			gsap.set(badgeEl, { opacity: 0, scale: 0 });
			gsap.set(currentEl, { opacity: 0, scale: 0.8 });
		} else {
			gsap.set(badgeEl, { opacity: 1, scale: 1 });
			gsap.set(currentEl, { opacity: 1, scale: 1 });
		}
		updateDebug("mount");
	}, [updateDebug]);

	useEffect(() => {
		if (nextState === null) return;

		const badgeEl = badgeRef.current;
		const currentEl = currentIconRef.current;
		const nextEl = nextIconRef.current;

		if (!badgeEl || !currentEl || !nextEl) {
			setCurrentStateSafe(nextState);
			setNextState(null);
			finishTransition();
			return;
		}

		const prevState = currentStateRef.current;

		gsap.killTweensOf([currentEl, nextEl]);
		gsap.set(nextEl, { opacity: 0, scale: 0.8 });
		gsap.set(badgeEl, { opacity: 1, scale: 1 });

		const tl = gsap.timeline({
			onComplete: () => {
				setCurrentStateSafe(nextState);
				setNextState(null);
				gsap.set(currentEl, { opacity: 1, scale: 1 });
				updateDebug("crossfade done");
				finishTransition();
			},
		});

		if (prevState === "waiting") {
			tl.to(nextEl, {
				opacity: 1,
				scale: 1,
				duration: 0.25,
				ease: "back.out(1.7)",
			});
			return;
		}

		tl.to(currentEl, { opacity: 0, duration: 0.1 });
		tl.to(
			nextEl,
			{
				opacity: 1,
				scale: 1,
				duration: 0.2,
				ease: "back.out(1.7)",
			},
			"<",
		);
	}, [finishTransition, nextState, setCurrentStateSafe, updateDebug]);

	const badgeState = nextState ?? currentState;

	const renderBadgeIcon = (badgeIconState: ComputerState | null) => {
		switch (badgeIconState) {
			case "loading":
				return <BadgeLoadingIcon />;
			case "accept":
				return <BadgeAcceptIcon />;
			case "reject":
				return <BadgeRejectIcon />;
			default:
				return null;
		}
	};

	return (
		<div
			style={{
				width: COMPUTER_WIDTH,
				height: 120,
				position: "relative",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				flexShrink: 0,
			}}
		>
			{/* Computer frame */}
			<Icon
				icon="material-symbols-light:computer-outline"
				width={COMPUTER_WIDTH}
				height={100}
				style={{ color: "#334155" }}
			/>

			{/* Inner icon inside computer screen */}
			<div
				style={{
					position: "absolute",
					top: INNER_ICON_TOP,
					left: INNER_ICON_LEFT,
					transform: INNER_ICON_LEFT === "50%" ? "translateX(-50%)" : "none",
				}}
			>
				<Icon
					icon={INNER_ICON}
					width={INNER_ICON_SIZE}
					height={INNER_ICON_SIZE}
					style={{ color: INNER_ICON_COLOR }}
				/>
			</div>

			{/* Result badge - starts hidden via CSS, GSAP autoAlpha controls visibility */}
			<div
				ref={badgeRef}
				style={{
					position: "absolute",
					top: 4,
					right: 20,
					width: 24,
					height: 24,
					borderRadius: "50%",
					backgroundColor: getBadgeColor(badgeState),
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					transition: "background-color 0.3s ease-out",
				}}
			>
				<div
					ref={debugRef}
					style={{
						position: "absolute",
						bottom: "110%",
						left: "50%",
						transform: "translateX(-50%)",
						minWidth: 180,
						padding: "6px 8px",
						fontSize: 10,
						lineHeight: 1.3,
						whiteSpace: "pre",
						background: "rgba(17, 24, 39, 0.9)",
						color: "white",
						borderRadius: 6,
						pointerEvents: "none",
						zIndex: 50,
					}}
				/>
				<div
					ref={currentIconRef}
					style={{
						position: "absolute",
						inset: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						pointerEvents: "none",
					}}
				>
					{renderBadgeIcon(currentState)}
				</div>
				{nextState && (
					<div
						ref={nextIconRef}
						style={{
							position: "absolute",
							inset: 0,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							opacity: 0,
							transform: "scale(0.8)",
							pointerEvents: "none",
						}}
					>
						{renderBadgeIcon(nextState)}
					</div>
				)}
			</div>
		</div>
	);
}

export function HeroSection() {
	const containerRef = useRef<HTMLDivElement>(null);
	const conveyorRef = useRef<HTMLDivElement>(null);
	const personTitleId = useId();
	const [computers, setComputers] = useState<
		Array<{ id: number; state: ComputerState }>
	>([
		{ id: 0, state: "accept" },
		{ id: 1, state: "waiting" },
		{ id: 2, state: "waiting" },
		{ id: 3, state: "waiting" },
	]);
	const evaluationCountRef = useRef(0); // Tracks evaluations for 2:1 accept pattern

	useEffect(() => {
		if (!conveyorRef.current) return;

		const runCycle = (afterShift = false) => {
			const evalIndex = 1; // Always evaluate the second item (center position)

			// Start loading on current computer (optionally after shifting)
			setComputers((prev) => {
				if (!afterShift) {
					return prev.map((c, i) =>
						i === evalIndex ? { ...c, state: "loading" } : c,
					);
				}

				const maxId = Math.max(...prev.map((c) => c.id));
				const newComputers = [...prev.slice(1)];
				newComputers.push({ id: maxId + 1, state: "waiting" });
				return newComputers.map((c, i) =>
					i === evalIndex ? { ...c, state: "loading" } : c,
				);
			});

			// After loading duration, show result
			gsap.delayedCall(LOADING_DURATION, () => {
				// Use the evaluation counter to determine result (2:1 accept ratio)
				const currentEval = evaluationCountRef.current++;
				const result = getResult(currentEval);

				setComputers((prev) =>
					prev.map((c, i) => (i === evalIndex ? { ...c, state: result } : c)),
				);

				// After brief pause, move conveyor
				gsap.delayedCall(RESULT_PAUSE, () => {
					if (!conveyorRef.current) return;

					// Animate conveyor movement with undershoot/overshoot
					gsap.to(conveyorRef.current, {
						x: `-=${COMPUTER_WIDTH + COMPUTER_GAP}`,
						duration: MOVE_DURATION,
						ease: "back.inOut(1.2)",
						onComplete: () => {
							// Reset conveyor position (since we removed first item)
							gsap.set(conveyorRef.current, {
								x: `+=${COMPUTER_WIDTH + COMPUTER_GAP}`,
							});

							// Continue to next cycle (shift + loading in one render)
							runCycle(true);
						},
					});
				});
			});
		};

		const startDelay = gsap.delayedCall(0.5, runCycle);

		return () => {
			startDelay.kill();
			gsap.killTweensOf(conveyorRef.current);
		};
	}, []);

	return (
		<Box
			as="section"
			minH="100vh"
			bg="white"
			display="flex"
			alignItems="center"
			position="relative"
			overflow="hidden"
		>
			<Container maxW="container.xl" py={{ base: 16, md: 24 }}>
				<VStack gap={{ base: 12, md: 16 }} align="stretch">
					<VStack gap={6} maxW="800px">
						<Text
							as="span"
							fontSize="12px"
							fontWeight="semibold"
							letterSpacing="0.15em"
							textTransform="uppercase"
							color="#525252"
						>
							Master the fundamentals
						</Text>
						<Heading
							as="h1"
							fontSize={{ base: "48px", md: "72px" }}
							fontWeight="bold"
							letterSpacing="-0.02em"
							lineHeight="1.1"
							color="#0A0A0A"
						>
							Ahead of AI,
							<br />
							by mastering fundamentals
						</Heading>
						<Text fontSize="20px" color="#525252" maxW="600px">
							While others chase the latest trends, you'll build an unshakeable
							foundation that makes everything else click into place.
						</Text>
					</VStack>

					<Box
						ref={containerRef}
						position="relative"
						w="100%"
						h={{ base: "220px", md: "280px" }}
						bg="#F5F5F5"
						borderRadius="16px"
						overflow="hidden"
					>
						{/* Person with magnifying glass - centered */}
						<Box
							position="absolute"
							left="50%"
							bottom="30px"
							transform="translateX(-50%)"
							zIndex={10}
						>
							<svg
								width="120"
								height="120"
								viewBox="0 0 120 120"
								role="img"
								aria-labelledby={personTitleId}
							>
								<title id={personTitleId}>Person with magnifier</title>
								<PersonWithMagnifier />
							</svg>
						</Box>

						{/* Conveyor of computers */}
						<Box
							position="absolute"
							top="40px"
							left="50%"
							transform="translateX(-50%)"
							width="100%"
							display="flex"
							justifyContent="center"
						>
							<div
								ref={conveyorRef}
								style={{
									display: "flex",
									gap: COMPUTER_GAP,
									marginLeft: -(COMPUTER_WIDTH + COMPUTER_GAP) / 2,
								}}
							>
								{computers.map((computer) => (
									<ComputerItem
										key={computer.id}
										id={computer.id}
										state={computer.state}
									/>
								))}
							</div>
						</Box>

						{/* Label */}
						<Text
							position="absolute"
							bottom="10px"
							left="50%"
							transform="translateX(-50%)"
							fontSize="14px"
							fontWeight="500"
							color="#64748B"
						>
							Quality over quantity
						</Text>
					</Box>

					<Box textAlign="center">
						<Text
							as="span"
							fontSize="14px"
							fontWeight="medium"
							color="#525252"
							cursor="pointer"
							_hover={{ color: "#0A0A0A" }}
							transition="color 0.2s"
						>
							Explore why
						</Text>
					</Box>
				</VStack>
			</Container>
		</Box>
	);
}
