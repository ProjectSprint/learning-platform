import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as runtimeApi from "../runtime";

const SRC_ROOT = path.resolve(process.cwd(), "src");
const GAME_ROOT = path.resolve(SRC_ROOT, "components/game");
const GAME_TYPES_ROOT = path.resolve(GAME_ROOT, "types");

const ALLOWED_GAME_IMPORTS = new Set([
	"@/components/game/engine",
	"@/components/game/engine/game-provider",
	"@/components/game/engine/runtime",
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
				const isAllowedTypeModuleImport = importPath.startsWith(
					"@/components/game/types/",
				);
				if (ALLOWED_GAME_IMPORTS.has(importPath) || isAllowedTypeModuleImport) {
					continue;
				}
				offenders.push(
					`${path.relative(process.cwd(), file)} -> ${importPath}`,
				);
			}
		}

		expect(offenders.sort()).toEqual([]);
	});

	it("types modules contain no bridge aliases (_Type -> Type re-exports)", () => {
		const typeFiles = listCodeFiles(GAME_TYPES_ROOT);
		const offenders: string[] = [];

		for (const file of typeFiles) {
			const source = readFileSync(file, "utf8");
			const lines = source.split("\n");

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (
					line.includes(" as ") &&
					(line.includes("export") || line.includes("import"))
				) {
					const underscoreAlias =
						/_([A-Z][A-Za-z]*)\s+as\s+([A-Z][A-Za-z]*)/.exec(line);
					if (underscoreAlias) {
						offenders.push(
							`${path.relative(process.cwd(), file)}:${i + 1} -> _${underscoreAlias[1]} as ${underscoreAlias[2]}`,
						);
					}
				}
			}
		}

		expect(offenders).toEqual([]);
	});

	it("types modules use only type exports (no runtime value re-exports except type guards)", () => {
		const typeFiles = listCodeFiles(GAME_TYPES_ROOT);
		const offenders: string[] = [];

		for (const file of typeFiles) {
			const source = readFileSync(file, "utf8");
			const lines = source.split("\n");

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i].trim();
				if (
					line.startsWith("export {") &&
					!line.includes("export type") &&
					!line.startsWith("export type")
				) {
					offenders.push(
						`${path.relative(process.cwd(), file)}:${i + 1} -> runtime value export in types module`,
					);
				}
				const isTypeGuard = source
					.slice(source.indexOf(line, lines.slice(0, i).join("\n").length))
					.match(/^export const \w+ = \([^)]*\)[^:]*:[^=]*\bis\b/);
				if (
					(line.startsWith("export const ") ||
						line.startsWith("export function ") ||
						line.startsWith("export class ")) &&
					!isTypeGuard
				) {
					offenders.push(
						`${path.relative(process.cwd(), file)}:${i + 1} -> runtime value declaration in types module (type guards allowed, others not)`,
					);
				}
			}
		}

		expect(offenders).toEqual([]);
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
