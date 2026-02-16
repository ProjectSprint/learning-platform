import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as runtimeApi from "../runtime";

const SRC_ROOT = path.resolve(process.cwd(), "src");
const GAME_ROOT = path.resolve(SRC_ROOT, "components/game");

const ALLOWED_GAME_IMPORTS = new Set([
	"@/components/game/engine",
	"@/components/game/engine/game-provider",
	"@/components/game/engine/runtime",
	"@/components/game/engine/runtime/types",
]);

const listCodeFiles = (dir: string): string[] => {
	const entries = readdirSync(dir);
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(dir, entry);
		const stats = statSync(fullPath);
		if (stats.isDirectory()) {
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

const readGameImports = (source: string): string[] => {
	const found = new Set<string>();
	const fromRegex = /from\s+["'](@\/components\/game\/[^"']+)["']/g;
	const bareImportRegex = /import\s+["'](@\/components\/game\/[^"']+)["']/g;
	const dynamicImportRegex =
		/import\(\s*["'](@\/components\/game\/[^"']+)["']\s*\)/g;

	for (const regex of [fromRegex, bareImportRegex, dynamicImportRegex]) {
		let match: RegExpExecArray | null = regex.exec(source);
		while (match) {
			const importPath = match[1];
			if (importPath) {
				found.add(importPath);
			}
			match = regex.exec(source);
		}
	}

	return Array.from(found);
};

describe("game public import boundary", () => {
	it("outside src/components/game uses only facade entrypoints", () => {
		const files = listCodeFiles(SRC_ROOT).filter(
			(filePath) => !filePath.startsWith(`${GAME_ROOT}${path.sep}`),
		);
		const offenders: string[] = [];

		for (const file of files) {
			const source = readFileSync(file, "utf8");
			const imports = readGameImports(source);

			for (const importPath of imports) {
				if (ALLOWED_GAME_IMPORTS.has(importPath)) {
					continue;
				}
				offenders.push(
					`${path.relative(process.cwd(), file)} -> ${importPath}`,
				);
			}
		}

		expect(offenders.sort()).toEqual([]);
	});

	it("engine runtime exports only question-facing value APIs", () => {
		expect(Object.keys(runtimeApi).sort()).toEqual(
			[
				"bootstrapQuestion",
				"buildEntityArrivedTrigger",
				"buildEntityClickTrigger",
				"buildEntityPlacedTrigger",
				"buildModalSubmitTrigger",
				"buildTerminalInputTrigger",
				"chooseLaneForExecution",
				"deriveQuestionPhase",
				"entityIsInSpace",
				"findEntitySpace",
				"isGridSpace",
				"isItem",
				"listSpaceEntityIds",
				"useQuestionRuntime",
			].sort(),
		);
	});
});
