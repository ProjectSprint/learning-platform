import { describe, expect, it } from "vitest";
import {
	calculateRank,
	calculateXPMultiplier,
	getRankInfo,
	getRankProgress,
	getXPToNextRank,
	RANK_THRESHOLDS,
} from "./rank";

describe("calculateRank", () => {
	it("returns newcomer for 0 XP", () => {
		expect(calculateRank(0)).toBe("newcomer");
	});

	it("returns newcomer for XP below junior threshold", () => {
		expect(calculateRank(500)).toBe("newcomer");
		expect(calculateRank(999)).toBe("newcomer");
	});

	it("returns junior at 1000 XP", () => {
		expect(calculateRank(1000)).toBe("junior");
	});

	it("returns junior for XP between junior and medior", () => {
		expect(calculateRank(1500)).toBe("junior");
		expect(calculateRank(2999)).toBe("junior");
	});

	it("returns medior at 3000 XP", () => {
		expect(calculateRank(3000)).toBe("medior");
	});

	it("returns medior for XP between medior and master", () => {
		expect(calculateRank(5000)).toBe("medior");
		expect(calculateRank(9999)).toBe("medior");
	});

	it("returns master at 10000 XP", () => {
		expect(calculateRank(10000)).toBe("master");
	});

	it("returns master for XP between master and shaman", () => {
		expect(calculateRank(15000)).toBe("master");
		expect(calculateRank(29999)).toBe("master");
	});

	it("returns shaman at 30000 XP", () => {
		expect(calculateRank(30000)).toBe("shaman");
	});

	it("returns shaman for XP above shaman threshold", () => {
		expect(calculateRank(50000)).toBe("shaman");
		expect(calculateRank(100000)).toBe("shaman");
	});

	// Test rank oscillation at boundaries (intentional design)
	it("allows rank oscillation at boundaries", () => {
		// At exactly 1000 XP, user is Junior
		expect(calculateRank(1000)).toBe("junior");
		// If they lose 1 XP, they drop back to Newcomer
		expect(calculateRank(999)).toBe("newcomer");
		// This oscillation is intentional per spec
	});
});

describe("calculateXPMultiplier", () => {
	it("returns 1.0 for green result", () => {
		expect(calculateXPMultiplier("green")).toBe(1.0);
	});

	it("returns 0.5 for yellow result", () => {
		expect(calculateXPMultiplier("yellow")).toBe(0.5);
	});

	it("returns 0 for red result", () => {
		expect(calculateXPMultiplier("red")).toBe(0);
	});
});

describe("getXPToNextRank", () => {
	it("returns correct XP needed from newcomer to junior", () => {
		const result = getXPToNextRank(0);
		expect(result.nextRank).toBe("junior");
		expect(result.xpNeeded).toBe(1000);
	});

	it("returns correct XP needed from junior to medior", () => {
		const result = getXPToNextRank(1500);
		expect(result.nextRank).toBe("medior");
		expect(result.xpNeeded).toBe(1500); // 3000 - 1500
	});

	it("returns correct XP needed from medior to master", () => {
		const result = getXPToNextRank(5000);
		expect(result.nextRank).toBe("master");
		expect(result.xpNeeded).toBe(5000); // 10000 - 5000
	});

	it("returns correct XP needed from master to shaman", () => {
		const result = getXPToNextRank(15000);
		expect(result.nextRank).toBe("shaman");
		expect(result.xpNeeded).toBe(15000); // 30000 - 15000
	});

	it("returns null for next rank when at shaman", () => {
		const result = getXPToNextRank(30000);
		expect(result.nextRank).toBeNull();
		expect(result.xpNeeded).toBe(0);
	});

	it("returns null for next rank when above shaman threshold", () => {
		const result = getXPToNextRank(50000);
		expect(result.nextRank).toBeNull();
		expect(result.xpNeeded).toBe(0);
	});

	it("calculates correctly at exact rank thresholds", () => {
		const atJunior = getXPToNextRank(1000);
		expect(atJunior.nextRank).toBe("medior");
		expect(atJunior.xpNeeded).toBe(2000); // 3000 - 1000

		const atMedior = getXPToNextRank(3000);
		expect(atMedior.nextRank).toBe("master");
		expect(atMedior.xpNeeded).toBe(7000); // 10000 - 3000
	});
});

describe("getRankProgress", () => {
	it("returns 0% at the start of a rank", () => {
		expect(getRankProgress(0)).toBe(0); // Start of newcomer
		expect(getRankProgress(1000)).toBe(0); // Start of junior
		expect(getRankProgress(3000)).toBe(0); // Start of medior
	});

	it("returns 50% at midpoint of a rank", () => {
		expect(getRankProgress(500)).toBe(50); // Halfway to junior (500/1000)
		expect(getRankProgress(2000)).toBe(50); // Halfway from junior to medior (1000/2000)
	});

	it("returns nearly 100% just before next rank", () => {
		const progress = getRankProgress(999);
		expect(progress).toBeCloseTo(99.9, 0);
	});

	it("returns 100% at max rank (shaman)", () => {
		expect(getRankProgress(30000)).toBe(100);
		expect(getRankProgress(50000)).toBe(100);
	});

	it("calculates progress correctly for each rank range", () => {
		// Newcomer to Junior (0 to 1000)
		expect(getRankProgress(250)).toBe(25); // 250/1000 = 25%

		// Junior to Medior (1000 to 3000, range of 2000)
		expect(getRankProgress(1500)).toBe(25); // (1500-1000)/2000 = 25%
		expect(getRankProgress(2000)).toBe(50); // (2000-1000)/2000 = 50%

		// Medior to Master (3000 to 10000, range of 7000)
		expect(getRankProgress(6500)).toBe(50); // (6500-3000)/7000 = 50%
	});
});

describe("getRankInfo", () => {
	it("returns correct info for newcomer", () => {
		const info = getRankInfo("newcomer");
		expect(info.color).toBe("gray");
		expect(info.icon).toBe("🌱");
		expect(info.label).toBe("Newcomer");
		expect(info.description).toBe("Just started");
	});

	it("returns correct info for junior", () => {
		const info = getRankInfo("junior");
		expect(info.color).toBe("bronze");
		expect(info.icon).toBe("📘");
		expect(info.label).toBe("Junior");
		expect(info.description).toBe("Learning fundamentals");
	});

	it("returns correct info for medior", () => {
		const info = getRankInfo("medior");
		expect(info.color).toBe("silver");
		expect(info.icon).toBe("🛡️");
		expect(info.label).toBe("Medior");
		expect(info.description).toBe("Solid understanding");
	});

	it("returns correct info for master", () => {
		const info = getRankInfo("master");
		expect(info.color).toBe("gold");
		expect(info.icon).toBe("⭐");
		expect(info.label).toBe("Master");
		expect(info.description).toBe("Deep expertise");
	});

	it("returns correct info for shaman", () => {
		const info = getRankInfo("shaman");
		expect(info.color).toBe("purple");
		expect(info.icon).toBe("🔮");
		expect(info.label).toBe("Shaman");
		expect(info.description).toBe("Mastery achieved");
	});
});

describe("RANK_THRESHOLDS", () => {
	it("has correct threshold values", () => {
		expect(RANK_THRESHOLDS.newcomer).toBe(0);
		expect(RANK_THRESHOLDS.junior).toBe(1000);
		expect(RANK_THRESHOLDS.medior).toBe(3000);
		expect(RANK_THRESHOLDS.master).toBe(10000);
		expect(RANK_THRESHOLDS.shaman).toBe(30000);
	});

	it("has exponentially increasing thresholds", () => {
		// Verify the scaling is exponential as per spec
		expect(RANK_THRESHOLDS.junior).toBeGreaterThan(RANK_THRESHOLDS.newcomer);
		expect(RANK_THRESHOLDS.medior - RANK_THRESHOLDS.junior).toBeGreaterThan(
			RANK_THRESHOLDS.junior - RANK_THRESHOLDS.newcomer,
		);
		expect(RANK_THRESHOLDS.master - RANK_THRESHOLDS.medior).toBeGreaterThan(
			RANK_THRESHOLDS.medior - RANK_THRESHOLDS.junior,
		);
		expect(RANK_THRESHOLDS.shaman - RANK_THRESHOLDS.master).toBeGreaterThan(
			RANK_THRESHOLDS.master - RANK_THRESHOLDS.medior,
		);
	});
});
