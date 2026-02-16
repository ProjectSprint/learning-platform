export type PaperclipPose = "idle" | "idea" | "success" | "error" | "warning";

/**
 * SVG path data for each pose — all designed for viewBox "0 0 64 80".
 * Each is a single open path that GSAP MorphSVG can interpolate between.
 */
export const POSE_PATHS: Record<PaperclipPose, string> = {
	// Classic paperclip wire shape
	idle: "M 20 72 L 20 24 C 20 10, 44 10, 44 24 L 44 62 C 44 70, 30 70, 30 62 L 30 30",

	// Lightbulb silhouette
	idea: "M 32 8 C 18 8, 12 22, 20 34 C 24 40, 26 44, 26 50 L 38 50 C 38 44, 40 40, 44 34 C 52 22, 46 8, 32 8",

	// Checkmark shape
	success: "M 12 42 L 26 58 L 52 22",

	// X / cross shape
	error: "M 16 20 L 48 60 M 48 20 L 16 60",

	// Exclamation mark shape
	warning: "M 32 12 L 32 48 M 32 58 L 32 62",
};

/**
 * Detect which pose to use based on the leading emoji in hint content.
 */
const POSE_PREFIXES: [string, PaperclipPose][] = [
	["\u274C", "error"], // ❌
	["\u26A0", "warning"], // ⚠️ (base char without variation selector)
	["\uD83C\uDF89", "success"], // 🎉
	["\u2705", "success"], // ✅
	["\uD83D\uDCA1", "idea"], // 💡
	["\uD83D\uDD12", "idea"], // 🔒
];

export const detectPose = (content: string | null): PaperclipPose => {
	if (!content) return "idle";

	for (const [prefix, pose] of POSE_PREFIXES) {
		if (content.startsWith(prefix)) return pose;
	}

	return "idle";
};
