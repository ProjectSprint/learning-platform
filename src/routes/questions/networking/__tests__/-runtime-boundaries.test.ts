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

	const DEFINITION_FILES = [
		"dhcp/-utils/definition.ts",
		"internet/-utils/definition.ts",
		"webserver-ssl/-utils/definition.ts",
		"tcp/-utils/definition.ts",
		"udp/-utils/definition.ts",
	];

	it("all question definitions include behaviors field", () => {
		const missing: string[] = [];

		for (const relPath of DEFINITION_FILES) {
			const fullPath = path.join(NETWORKING_ROOT, relPath);
			const content = readFileSync(fullPath, "utf8");
			if (!content.includes("behaviors")) {
				missing.push(relPath);
			}
		}

		expect(missing).toEqual([]);
	});

	it("page files do not contain event loop patterns (for...of events)", () => {
		const pageFiles = [
			"dhcp/-page.tsx",
			"internet/-page.tsx",
			"webserver-ssl/-page.tsx",
			"tcp/-page.tsx",
			"udp/-page.tsx",
		];
		const offenders: string[] = [];

		for (const relPath of pageFiles) {
			const fullPath = path.join(NETWORKING_ROOT, relPath);
			const content = readFileSync(fullPath, "utf8");
			if (/for\s*\(\s*const\s+event\s+of\s+events\s*\)/.test(content)) {
				offenders.push(`${relPath} (event loop should be in behavior reactor)`);
			}
		}

		expect(offenders).toEqual([]);
	});

	it("page files do not use eventTick state pattern", () => {
		const pageFiles = [
			"dhcp/-page.tsx",
			"internet/-page.tsx",
			"webserver-ssl/-page.tsx",
			"tcp/-page.tsx",
			"udp/-page.tsx",
		];
		const offenders: string[] = [];

		for (const relPath of pageFiles) {
			const fullPath = path.join(NETWORKING_ROOT, relPath);
			const content = readFileSync(fullPath, "utf8");
			if (content.includes("eventTick")) {
				offenders.push(
					`${relPath} (eventTick should be replaced with reactive deps)`,
				);
			}
		}

		expect(offenders).toEqual([]);
	});

	it("migrated routes do not own config-save logic in page event loops", () => {
		const offenders: string[] = [];

		const dhcpPage = readFileSync(
			path.join(NETWORKING_ROOT, "dhcp/-page.tsx"),
			"utf8",
		);
		if (dhcpPage.includes("event.values.dhcpEnabled")) {
			offenders.push(
				"dhcp/-page.tsx (router config save should be in behaviors)",
			);
		}

		const sslPage = readFileSync(
			path.join(NETWORKING_ROOT, "webserver-ssl/-page.tsx"),
			"utf8",
		);
		if (sslPage.includes("event.values.domain")) {
			offenders.push(
				"webserver-ssl/-page.tsx (certificate issue should be in behaviors)",
			);
		}

		expect(offenders).toEqual([]);
	});
});
