import { gsap } from "gsap";
import {
	forwardRef,
	useImperativeHandle,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

export type TetrisHandle = {
	play: () => void;
	restart: () => void;
};

type TetrisProps = {
	theme?: "light" | "dark";
	showControls?: boolean;
};

type Piece = {
	id: string;
	label: string;
	color: string;
	strokeColor: string;
	offsets: Array<[number, number]>;
	start: { x: number; y: number };
	target: { x: number; y: number };
	behavior: "drop" | "fadeIn";
};

const rows = 10;
const cols = 6;
const subgridRows = rows * 2 + 1;

type PieceKind = "T" | "O" | "L" | "I" | "U" | "B";

const baseShapes: Record<PieceKind, Array<[number, number]>> = {
	B: [
		[-2.5, -1.5],
		[-1.5, -1.5],
		[-0.5, -1.5],
		[0.5, -1.5],
		[1.5, -1.5],
		[2.5, -1.5],

		[-2.5, -0.5],
		[-1.5, -0.5],
		[-0.5, -0.5],
		[0.5, -0.5],
		[1.5, -0.5],
		[2.5, -0.5],

		[-2.5, 0.5],
		[-1.5, 0.5],
		[-0.5, 0.5],
		[0.5, 0.5],
		[1.5, 0.5],
		[2.5, 0.5],

		[-2.5, 1.5],
		[-1.5, 1.5],
		[-0.5, 1.5],
		[0.5, 1.5],
		[1.5, 1.5],
		[2.5, 1.5],
	],
	T: [
		[0, 0],
		[-1, 0],
		[1, 0],
		[0, 1],
	],
	O: [
		[-0.5, 0.5],
		[0.5, 0.5],
		[-0.5, -0.5],
		[0.5, -0.5],
	],
	L: [
		[0, 0],
		[0, 1],
		[-1, 0],
	],
	I: [
		[-1.5, 0],
		[-0.5, 0],
		[0.5, 0],
		[1.5, 0],
	],
	U: [
		[-1, 0],
		[0, 0],
		[1, 0],
		[-1, 1],
		[1, 1],
	],
};

const rotateOffsets = (offsets: Array<[number, number]>, turns: number) => {
	const rotations = ((turns % 4) + 4) % 4;
	let rotated = offsets;
	for (let i = 0; i < rotations; i += 1) {
		rotated = rotated.map(([x, y]) => [y, -x]);
	}
	return rotated;
};

const toSubgridOffsets = (offsets: Array<[number, number]>) =>
	offsets.map(([x, y]) => [x * 2, y * 2] as [number, number]);

const placements = [
	{
		id: "ip",
		label: "IP Address",
		kind: "T",
		rotation: 0,
		x: 8,
		y: 1,
		behavior: "drop",
	},
	{
		id: "tcp",
		label: "TCP",
		kind: "U",
		rotation: 180,
		x: 8,
		y: 5,
		behavior: "drop",
	},
	{
		id: "udp",
		label: "UDP",
		kind: "I",
		rotation: 90,
		x: 12,
		y: 4,
		behavior: "drop",
	},
	{
		id: "dns",
		label: "DNS",
		kind: "O",
		rotation: 0,
		x: 3,
		y: 2,
		behavior: "drop",
	},
	{
		id: "http",
		label: "HTTP",
		kind: "L",
		rotation: 90,
		x: 2,
		y: 5,
		behavior: "drop",
	},
	{
		id: "ssl",
		label: "SSL",
		kind: "I",
		rotation: 0,
		x: 7,
		y: 7,
		behavior: "drop",
	},
	{
		id: "networking",
		label: "Networking",
		kind: "B",
		rotation: 0,
		x: 7,
		y: 4,
		behavior: "fadeIn",
	},
] as const;

const darkenHex = (hex: string, amount: number) => {
	const value = hex.replace("#", "");
	if (value.length !== 6) return hex;
	const clamp = (num: number) => Math.max(0, Math.min(255, num));
	const r = clamp(parseInt(value.slice(0, 2), 16) - amount);
	const g = clamp(parseInt(value.slice(2, 4), 16) - amount);
	const b = clamp(parseInt(value.slice(4, 6), 16) - amount);
	return `#${r.toString(16).padStart(2, "0")}${g
		.toString(16)
		.padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

const sequence: Piece[] = placements.map((placement, index) => {
	const offsets = toSubgridOffsets(
		rotateOffsets(baseShapes[placement.kind], placement.rotation / 90),
	);
	const colors = [
		"#1d4ed8",
		"#15803d",
		"#c2410c",
		"#6d28d9",
		"#be185d",
		"#0e7490",
	];
	const color = colors[index % colors.length];
	return {
		id: placement.id,
		label: placement.label,
		color,
		strokeColor: darkenHex(color, 35),
		offsets,
		start: { x: placement.x, y: subgridRows + 4 },
		target: { x: placement.x, y: placement.y },
		behavior: placement.behavior ?? "drop",
	};
});

const pieceGap = 2;

const getStrokeStyle = (
	key: Set<string>,
	offsetX: number,
	offsetY: number,
	strokeColor: string,
) => {
	const has = (x: number, y: number) => key.has(`${x},${y}`);
	const strokeSize = 2;
	const top = has(offsetX, offsetY + 2) ? "transparent" : strokeColor;
	const right = has(offsetX + 2, offsetY) ? "transparent" : strokeColor;
	const bottom = has(offsetX, offsetY - 2) ? "transparent" : strokeColor;
	const left = has(offsetX - 2, offsetY) ? "transparent" : strokeColor;
	return {
		backgroundImage: [
			`linear-gradient(${top}, ${top})`,
			`linear-gradient(${right}, ${right})`,
			`linear-gradient(${bottom}, ${bottom})`,
			`linear-gradient(${left}, ${left})`,
		].join(","),
		backgroundSize: [
			`100% ${strokeSize}px`,
			`${strokeSize}px 100%`,
			`100% ${strokeSize}px`,
			`${strokeSize}px 100%`,
		].join(","),
		backgroundPosition: [
			"top left",
			"top right",
			"bottom left",
			"top left",
		].join(","),
		backgroundRepeat: "no-repeat",
	};
};

const Tetris = forwardRef<TetrisHandle, TetrisProps>(function Tetris(
	{ theme = "dark", showControls = true },
	ref,
) {
	const boardRef = useRef<HTMLDivElement | null>(null);
	const gridRef = useRef<HTMLDivElement | null>(null);
	const pieceRefs = useRef<Array<HTMLDivElement | null>>([]);
	const timelineRef = useRef<gsap.core.Timeline | null>(null);
	const [cellSize, setCellSize] = useState(24);
	const [isPlaying, setIsPlaying] = useState(false);

	const isLight = theme === "light";

	useImperativeHandle(ref, () => ({
		play: () => {
			const timeline = timelineRef.current;
			if (!timeline) return;

			if (timeline.progress() >= 1) {
				timeline.restart();
				setIsPlaying(true);
				return;
			}

			if (!timeline.isActive()) {
				timeline.play(0);
				setIsPlaying(true);
			}
		},
		restart: () => {
			const timeline = timelineRef.current;
			if (!timeline) return;
			timeline.restart();
			setIsPlaying(true);
		},
	}));

	useLayoutEffect(() => {
		if (!boardRef.current) return;

		const updateSize = () => {
			const rect = boardRef.current?.getBoundingClientRect();
			if (rect?.width) {
				setCellSize(rect.width / cols);
			}
		};

		updateSize();
		const observer = new ResizeObserver(updateSize);
		observer.observe(boardRef.current);

		return () => observer.disconnect();
	}, []);

	useLayoutEffect(() => {
		if (!boardRef.current) return;

		const clearBoard = () => {
			if (gridRef.current) {
				gsap.set(gridRef.current, { opacity: 1 });
			}
			pieceRefs.current.forEach((pieceEl) => {
				if (pieceEl) gsap.set(pieceEl, { opacity: 0 });
			});
		};

		const unit = cellSize / 2;
		const centerToPixels = (point: { x: number; y: number }) => ({
			x: (point.x - 1) * unit,
			y: (subgridRows - point.y - 1) * unit,
		});

		timelineRef.current?.kill();
		const timeline = gsap.timeline({
			paused: true,
			defaults: { ease: "bounce.out" },
			onComplete: () => setIsPlaying(false),
		});

		timeline.add(() => {
			clearBoard();
		});

		sequence.forEach((piece, index) => {
			const pieceEl = pieceRefs.current[index];
			if (!pieceEl) return;

			const start = centerToPixels(piece.start);
			const target = centerToPixels(piece.target);

			timeline.set(pieceEl, {
				x: start.x,
				y: start.y,
				xPercent: -50,
				yPercent: -50,
				opacity: 1,
			});
			if (piece.behavior === "fadeIn") {
				timeline.add(() => {
					const others = pieceRefs.current.filter(
						(_, pieceIndex) => pieceIndex !== index,
					);
					gsap.to(others, { opacity: 0, duration: 0.3, ease: "power2.out" });
				});
				timeline.set(pieceEl, { x: target.x, y: target.y, opacity: 0 });
				timeline.to(pieceEl, {
					opacity: 1,
					duration: 0.6,
					ease: "power2.out",
				});
				return;
			}
			timeline.to(pieceEl, {
				x: target.x,
				y: target.y,
				duration: 0.5,
				delay: 0,
				ease: "back.out(0.7)",
			});
		});

		timelineRef.current = timeline;

		return () => {
			timeline.kill();
		};
	}, [cellSize]);

	const handlePlayToggle = () => {
		const timeline = timelineRef.current;
		if (!timeline) return;

		if (timeline.progress() >= 1) {
			timeline.restart();
			setIsPlaying(true);
			return;
		}

		if (timeline.isActive() || timeline.progress() > 0) {
			if (timeline.paused()) {
				timeline.play();
				setIsPlaying(true);
			} else {
				timeline.pause();
				setIsPlaying(false);
			}
			return;
		}

		timeline.play(0);
		setIsPlaying(true);
	};

	const handleRepeat = () => {
		const timeline = timelineRef.current;
		if (!timeline) return;
		timeline.restart();
		setIsPlaying(true);
	};

	const unit = cellSize / 2;

	return (
		<div className="min-h-screen px-6 py-12 flex items-center justify-center">
			<div className="w-full max-w-5xl flex flex-col items-center gap-12">
				<header className="text-center space-y-5">
					<div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-200 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-900">
						Network playground
					</div>
					<h1 className="text-5xl md:text-6xl font-semibold text-slate-900">
						Tetris, but for protocols
					</h1>
					<p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
						A bright, playful motion study where networking blocks snap into one
						big idea.
					</p>
				</header>

				<div className="relative flex flex-col items-center gap-6">
					<div className="pointer-events-none absolute -inset-24 bg-[radial-gradient(circle,rgba(125,211,252,0.75),rgba(125,211,252,0))] blur-3xl" />
					<div className="pointer-events-none absolute -left-24 top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(252,211,77,0.7),rgba(252,211,77,0))] blur-2xl" />
					<div className="relative z-10 rounded-[30px] border border-white/90 bg-white px-6 py-7 shadow-[0_40px_90px_-45px_rgba(15,23,42,0.5)]">
						<div
							ref={boardRef}
							className={`relative w-[min(72vw,300px)] md:w-[min(32vw,320px)] aspect-[3/5] rounded-[22px] border overflow-hidden ${
								isLight
									? "border-slate-200 bg-white"
									: "border-white/10 bg-[radial-gradient(circle_at_top,#0f172a_0%,#0b1220_55%,#020617_100%)]"
							}`}
						>
							<div className="absolute inset-0 bg-white" />
							<div
								ref={gridRef}
								className="relative z-0 grid h-full w-full grid-cols-[repeat(6,minmax(0,1fr))] grid-rows-[repeat(10,minmax(0,1fr))] rounded-[18px]"
							>
								{Array.from({ length: rows * cols }).map((_, index) => {
									const row = Math.floor(index / cols);
									const col = index % cols;
									return (
										<div
											key={`${row}-${col}`}
											className="bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]"
										/>
									);
								})}
							</div>

							<div className="pointer-events-none absolute inset-0 z-10">
								{sequence.map((piece, index) => (
									<div
										key={piece.id}
										ref={(el) => {
											pieceRefs.current[index] = el;
										}}
										className="absolute left-0 top-0 opacity-0"
									>
										{(() => {
											const key = new Set(
												piece.offsets.map(([x, y]) => `${x},${y}`),
											);
											const inset = pieceGap / 2;
											return piece.offsets.map(([offsetX, offsetY]) => {
												const hasTop = key.has(`${offsetX},${offsetY + 2}`);
												const hasRight = key.has(`${offsetX + 2},${offsetY}`);
												const hasBottom = key.has(`${offsetX},${offsetY - 2}`);
												const hasLeft = key.has(`${offsetX - 2},${offsetY}`);
												const connectOverlap = pieceGap + 1.5;
												const width =
													cellSize -
													pieceGap +
													(hasLeft ? connectOverlap : 0) +
													(hasRight ? connectOverlap : 0);
												const height =
													cellSize -
													pieceGap +
													(hasTop ? connectOverlap : 0) +
													(hasBottom ? connectOverlap : 0);
												const x =
													offsetX * unit -
													cellSize / 2 +
													inset -
													(hasLeft ? connectOverlap : 0);
												const y =
													-offsetY * unit -
													cellSize / 2 +
													inset -
													(hasTop ? connectOverlap : 0);

												return (
													<div
														key={`${piece.id}-${offsetX}-${offsetY}`}
														className="absolute"
														style={{
															width,
															height,
															transform: `translate(${x}px, ${y}px)`,
															backgroundColor: "transparent",
															borderRadius: 0,
															boxSizing: "border-box",
															...getStrokeStyle(
																key,
																offsetX,
																offsetY,
																piece.strokeColor,
															),
														}}
													/>
												);
											});
										})()}
										<div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-900">
											{piece.label}
										</div>
									</div>
								))}
							</div>
						</div>
					</div>

					{showControls && (
						<div className="relative z-10 flex flex-wrap items-center justify-center gap-4">
							<button
								type="button"
								onClick={handlePlayToggle}
								className="rounded-full bg-slate-900 px-7 py-3 text-base font-semibold text-white shadow-[0_18px_36px_-18px_rgba(15,23,42,0.7)] transition hover:-translate-y-0.5 hover:bg-slate-800"
							>
								{isPlaying ? "Pause" : "Play"}
							</button>
							<button
								type="button"
								onClick={handleRepeat}
								className="rounded-full border border-slate-300 bg-white px-7 py-3 text-base font-semibold text-slate-700 shadow-[0_14px_30px_-20px_rgba(15,23,42,0.5)] transition hover:-translate-y-0.5 hover:border-slate-400"
							>
								Repeat
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
});

export default Tetris;
