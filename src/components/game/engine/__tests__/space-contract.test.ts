import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
	readFileSync(resolve(process.cwd(), relativePath), "utf8");
const missingSpaceWarningSuffix =
	"not found in state. Did you forget to define it in QuestionDefinition?";

describe("engine space contract", () => {
	it("GridSpace has no implicit space-creation dispatch path", () => {
		const source = readSource(
			"src/components/game/engine/components/GridSpace.tsx",
		);
		expect(source).not.toContain("CREATE_SPACE");
		expect(source).not.toContain('type: "SPACE_CREATED"');
		expect(source).toContain(missingSpaceWarningSuffix);
	});

	it("PoolSpace has no implicit space-creation dispatch path", () => {
		const source = readSource(
			"src/components/game/engine/components/PoolSpace.tsx",
		);
		expect(source).not.toContain("CREATE_SPACE");
		expect(source).not.toContain('type: "SPACE_CREATED"');
		expect(source).toContain(missingSpaceWarningSuffix);
	});

	it("PathSpace has no implicit space-creation dispatch path", () => {
		const source = readSource(
			"src/components/game/engine/components/PathSpace.tsx",
		);
		expect(source).not.toContain("CREATE_SPACE");
		expect(source).not.toContain('type: "SPACE_CREATED"');
		expect(source).toContain(missingSpaceWarningSuffix);
	});

	it("PathSpace dispatches midpoint update contract", () => {
		const source = readSource(
			"src/components/game/engine/components/PathSpace.tsx",
		);
		expect(source).toContain("onEntityMidpoint");
		expect(source).toContain("pathMidpointTick");
		expect(source).toContain('type: "ENTITY_UPDATED"');
	});
});
