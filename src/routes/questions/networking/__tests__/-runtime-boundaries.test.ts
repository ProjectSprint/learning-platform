import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const NETWORKING_ROOT = path.resolve(
	process.cwd(),
	"src/routes/questions/networking",
);

const listCodeFiles = (dir: string): string[] => {
	const entries = readdirSync(dir);
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(dir, entry);
		const stats = statSync(fullPath);
		if (stats.isDirectory()) {
			if (entry === "__tests__") {
				continue;
			}
			files.push(...listCodeFiles(fullPath));
			continue;
		}

		if (!fullPath.endsWith(".ts") && !fullPath.endsWith(".tsx")) {
			continue;
		}
		files.push(fullPath);
	}

	return files;
};

describe("networking runtime boundaries", () => {
	it("does not call commands.setPhase directly", () => {
		const files = listCodeFiles(NETWORKING_ROOT);
		const offenders: string[] = [];

		for (const file of files) {
			const content = readFileSync(file, "utf8");
			if (content.includes("commands.setPhase(")) {
				offenders.push(path.relative(process.cwd(), file));
			}
		}

		expect(offenders).toEqual([]);
	});

	it("does not use route-level useGameDispatch", () => {
		const files = listCodeFiles(NETWORKING_ROOT);
		const offenders: string[] = [];

		for (const file of files) {
			const content = readFileSync(file, "utf8");
			if (/\buseGameDispatch\s*\(/.test(content)) {
				offenders.push(path.relative(process.cwd(), file));
			}
		}

		expect(offenders).toEqual([]);
	});
});
