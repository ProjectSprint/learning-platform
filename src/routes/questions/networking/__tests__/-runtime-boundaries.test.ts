import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const NETWORKING_ROOT = path.resolve(
	process.cwd(),
	"src/routes/questions/networking",
);
const QUESTIONS_ROOT = path.resolve(process.cwd(), "src/routes/questions");

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

const listDefinitionFiles = (dir: string): string[] =>
	listCodeFiles(dir).filter((filePath) => {
		const normalized = filePath.split(path.sep).join("/");
		return normalized.endsWith("/-utils/definition.ts");
	});

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

	it("definition files enforce factory-based authoring for spaces and entities", () => {
		const definitionFiles = listDefinitionFiles(QUESTIONS_ROOT);
		const missingFactoryUsage: string[] = [];
		const rawSpaceDefinitions: string[] = [];

		for (const file of definitionFiles) {
			const content = readFileSync(file, "utf8");
			const rel = path.relative(process.cwd(), file);

			if (!content.includes("SpaceFactory.")) {
				missingFactoryUsage.push(`${rel} (missing SpaceFactory usage)`);
			}

			if (!content.includes("EntityFactory.")) {
				missingFactoryUsage.push(`${rel} (missing EntityFactory usage)`);
			}

			if (/kind:\s*"(grid|pool|path|custom|queue|meter)"/.test(content)) {
				rawSpaceDefinitions.push(rel);
			}
		}

		expect(missingFactoryUsage).toEqual([]);
		expect(rawSpaceDefinitions).toEqual([]);
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

	it("tcp behaviors keep splitter conversion and server-delivery safeguards", () => {
		const tcpBehaviors = readFileSync(
			path.join(NETWORKING_ROOT, "tcp/-utils/behaviors.ts"),
			"utf8",
		);

		expect(
			tcpBehaviors.includes("ctx.world.deleteEntities([entity.id]);"),
		).toBe(true);
		expect(
			tcpBehaviors.includes('moveEntityToSpace(ctx, entity.id, "inventory")'),
		).toBe(false);
		expect(tcpBehaviors.includes("scheduleMoveToServerWithRetry")).toBe(true);
		expect(tcpBehaviors.includes("lockInReceivedPool(ctx, synId);")).toBe(true);
		expect(tcpBehaviors.includes("lockInReceivedPool(ctx, ackId);")).toBe(true);
		expect(
			tcpBehaviors.includes('ctx.phase === "syn-wait" || ctx.phase === "ack"'),
		).toBe(true);
		expect(tcpBehaviors.includes("state.splitterVisible = false;")).toBe(true);
		expect(tcpBehaviors.includes("state.splitterVisible = true;")).toBe(true);
		expect(tcpBehaviors.includes('tcpState: "queued"')).toBe(true);
		expect(
			tcpBehaviors.includes("getInternetPacketStaggerMs(ctx, entityId)"),
		).toBe(true);
	});

	it("tcp packet badges include waiting label for queued server slot", () => {
		const badgeUtils = readFileSync(
			path.join(NETWORKING_ROOT, "tcp/-utils/entity-badge.ts"),
			"utf8",
		);

		expect(
			badgeUtils.includes('queued: { label: "Waiting for server slot" }'),
		).toBe(true);
	});

	it("internet modal save rules are guarded per modal prefix", () => {
		const internetBehaviors = readFileSync(
			path.join(NETWORKING_ROOT, "internet/-utils/behaviors.ts"),
			"utf8",
		);

		expect(
			internetBehaviors.includes(
				'event.modalId.startsWith("router-lan-config-")',
			),
		).toBe(true);
		expect(
			internetBehaviors.includes(
				'event.modalId.startsWith("router-nat-config-")',
			),
		).toBe(true);
		expect(
			internetBehaviors.includes(
				'event.modalId.startsWith("router-wan-config-")',
			),
		).toBe(true);
		expect(internetBehaviors.includes('connectionType: "PPPoE"')).toBe(true);
	});

	it("webserver ssl has terminal readiness triggers and renamed pool labels", () => {
		const sslBehaviors = readFileSync(
			path.join(NETWORKING_ROOT, "webserver-ssl/-utils/behaviors.ts"),
			"utf8",
		);
		const sslConstants = readFileSync(
			path.join(NETWORKING_ROOT, "webserver-ssl/-utils/constants.ts"),
			"utf8",
		);

		expect(sslBehaviors.includes('buildEntityArrivedTrigger("port-80")')).toBe(
			true,
		);
		expect(sslBehaviors.includes('buildEntityArrivedTrigger("port-443")')).toBe(
			true,
		);
		expect(sslConstants.includes('name: "http components"')).toBe(true);
		expect(sslConstants.includes('name: "https components"')).toBe(true);
	});

	it("udp client header reflects tcp-vs-udp stage", () => {
		const udpPage = readFileSync(
			path.join(NETWORKING_ROOT, "udp/-page.tsx"),
			"utf8",
		);

		expect(
			udpPage.includes('mode === "tcp" ? "TCP Handshake" : "UDP Streaming"'),
		).toBe(true);
	});
});
