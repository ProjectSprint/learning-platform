import type { GameState } from "@/components/game/application/state/types";
import type { TerminalInputEvent } from "@/components/game/application/state/types/events";
import type {
	BehaviorDefinition,
	BehaviorRule,
} from "@/components/game/runtime";
import { modalSubmitted, terminalInput } from "@/components/game/runtime";
import { DEFAULT_DOMAIN, INDEX_HTML_CONTENT } from "./constants";
import { buildSuccessModal } from "./modal-builders";

export type SslBehaviorContext = {
	certificateDomain: string | null;
	navigateAway: boolean;
};

/** Derive SSL terminal state from game state. */
function deriveSslStatus(state: GameState) {
	const port80Space =
		state.spaces["port-80"]?.kind === "grid" ? state.spaces["port-80"] : null;
	const port443Space =
		state.spaces["port-443"]?.kind === "grid" ? state.spaces["port-443"] : null;

	const getTypes = (space: typeof port80Space) => {
		if (!space) return [];
		return Object.keys(space.entityPositions).map((entityId) => {
			const entity = state.entities[entityId];
			return entity?.type ?? "";
		});
	};

	const port80Types = getTypes(port80Space);
	const port443Types = getTypes(port443Space);

	const hasContent =
		port80Types.includes("index-html") ||
		port80Types.includes("redirect-to-https");
	const httpReady =
		port80Types.includes("webserver-80") &&
		port80Types.includes("domain") &&
		hasContent;

	const httpsReady =
		port443Types.includes("webserver-443") &&
		port443Types.includes("domain") &&
		port443Types.includes("index-html") &&
		port443Types.includes("certificate") &&
		port443Types.includes("private-key");

	const hasRedirect =
		port80Types.includes("webserver-80") &&
		port80Types.includes("domain") &&
		port80Types.includes("redirect-to-https");

	// Find domain from port-80 entities
	let port80Domain = DEFAULT_DOMAIN;
	if (port80Space) {
		for (const entityId of Object.keys(port80Space.entityPositions)) {
			const entity = state.entities[entityId];
			if (entity?.type === "domain" && typeof entity.data.domain === "string") {
				port80Domain = entity.data.domain;
				break;
			}
		}
	}

	return { httpReady, httpsReady, hasRedirect, port80Domain };
}

const rules: BehaviorRule<SslBehaviorContext>[] = [
	{
		id: "ssl.certificate-issue",
		on: modalSubmitted(undefined, "issue"),
		guard: ({ event }) =>
			event.type === "MODAL_SUBMITTED" &&
			event.modalId.startsWith("certificate-request-"),
		handler: ({ event, world, updateContext }) => {
			if (event.type !== "MODAL_SUBMITTED") return;
			const deviceId = event.modalId.replace("certificate-request-", "");
			const domain = String(event.values.domain ?? "").trim();

			if (domain) {
				world.updateEntity(deviceId, {
					data: {
						certificateIssued: true,
						verified: true,
						certificateDomain: domain,
					},
				});

				updateContext((ctx) => {
					ctx.certificateDomain = domain;
				});
			}
		},
	},
	{
		id: "ssl.success-modal-navigate",
		on: modalSubmitted("success", "primary"),
		handler: ({ updateContext }) => {
			updateContext((ctx) => {
				ctx.navigateAway = true;
			});
		},
	},

	// --- Terminal commands ---
	{
		id: "ssl.terminal-command",
		on: terminalInput(),
		guard: ({ state }) => state.question.status !== "completed",
		handler: ({ event, state, context, terminal, interaction, progress }) => {
			const rawInput = (event as TerminalInputEvent).input.trim();
			if (!rawInput) return;

			const tokens = rawInput.split(/\s+/);
			const command = tokens[0]?.toLowerCase();
			const ssl = deriveSslStatus(state);
			const getDomain = () =>
				ssl.port80Domain || context.certificateDomain || DEFAULT_DOMAIN;

			if (command === "curl") {
				if (tokens.includes("-h") || tokens.includes("--help")) {
					terminal.writeOutput(
						"Usage: curl [options] <url>\n\n" +
							"Options:\n" +
							"  -I, --head     Show document headers only\n" +
							"  -v, --verbose  Make the operation more talkative\n" +
							"  -k, --insecure  Allow insecure server connections (skip SSL)\n" +
							"\nExamples:\n" +
							"  curl http://example.com\n" +
							"  curl https://example.com",
					);
					return;
				}

				const verbose = tokens.includes("-v") || tokens.includes("--verbose");
				const headOnly = tokens.includes("-I") || tokens.includes("--head");
				const insecure = tokens.includes("-k") || tokens.includes("--insecure");

				let url = "";
				for (let i = tokens.length - 1; i >= 1; i--) {
					if (
						tokens[i].startsWith("http://") ||
						tokens[i].startsWith("https://")
					) {
						url = tokens[i];
						break;
					}
				}

				if (!url) {
					terminal.writeOutput(
						"Error: No URL specified. Usage: curl <url>",
						"error",
					);
					return;
				}

				const targetUrl = url.toLowerCase();

				if (targetUrl.startsWith("http://")) {
					if (ssl.hasRedirect) {
						const domain = getDomain();
						if (verbose) {
							terminal.writeOutput(`* Trying ${domain}...`);
							terminal.writeOutput(
								`* Connected to ${domain} (127.0.0.1) port 80`,
							);
						}
						terminal.writeOutput("HTTP/1.1 301 Moved Permanently");
						terminal.writeOutput(`Location: https://${domain}/`);
						terminal.writeOutput("");
						terminal.writeOutput("301 redirected (use -L to follow)");
					} else if (ssl.httpReady) {
						if (verbose) {
							terminal.writeOutput(`* Trying ${getDomain()}...`);
							terminal.writeOutput(
								`* Connected to ${getDomain()} (127.0.0.1) port 80`,
							);
						}
						terminal.writeOutput("HTTP/1.1 200 OK");
						terminal.writeOutput("Content-Type: text/html");
						if (!headOnly) {
							terminal.writeOutput("");
							terminal.writeOutput(INDEX_HTML_CONTENT);
						}
					} else {
						terminal.writeOutput(
							"Error: Connection refused. Webserver not configured.",
							"error",
						);
					}
					return;
				}

				if (targetUrl.startsWith("https://")) {
					if (insecure) {
						terminal.writeOutput(
							"Error: --insecure flag not supported in this simulation.",
							"error",
						);
						return;
					}
					if (!ssl.httpsReady) {
						terminal.writeOutput(
							"Error: SSL handshake failed. Certificate not found.",
							"error",
						);
						return;
					}

					const domain = getDomain();
					if (verbose) {
						terminal.writeOutput(`* Trying ${domain}:443...`);
						terminal.writeOutput(
							`* Connected to ${domain} (127.0.0.1) port 443`,
						);
						terminal.writeOutput(
							"* TLS 1.3 connection using TLS_AES_256_GCM_SHA384",
						);
						terminal.writeOutput("* Server certificate:");
						terminal.writeOutput(`*  subject: ${domain}`);
						terminal.writeOutput("*  issuer: Let's Encrypt Authority X3");
						terminal.writeOutput("*  SSL certificate verify ok.");
					}
					terminal.writeOutput(`🔒 TLS Handshake successful`);
					terminal.writeOutput(`   Certificate: ${domain}`);
					terminal.writeOutput("   Issuer: Let's Encrypt");
					terminal.writeOutput("");
					terminal.writeOutput("HTTP/1.1 200 OK");
					terminal.writeOutput("Content-Type: text/html");
					if (!headOnly) {
						terminal.writeOutput("");
						terminal.writeOutput(INDEX_HTML_CONTENT);
					}

					if (ssl.httpsReady && ssl.hasRedirect) {
						interaction.openModal(buildSuccessModal());
						terminal.finishEngine();
						progress.completeQuestion();
					}
					return;
				}

				terminal.writeOutput(
					"Error: Unknown URL scheme. Use http:// or https://",
					"error",
				);
				return;
			}

			if (command === "openssl") {
				const subCommand = tokens[1]?.toLowerCase();
				if (subCommand === "s_client") {
					let url = "";
					for (let i = tokens.length - 1; i >= 2; i--) {
						if (
							tokens[i].startsWith("https://") ||
							tokens[i].startsWith("http://")
						) {
							url = tokens[i];
							break;
						}
					}
					if (!url) {
						terminal.writeOutput("Usage: openssl s_client <url>");
						return;
					}
					if (!url.toLowerCase().startsWith("https://")) {
						terminal.writeOutput(
							"Error: s_client requires an https:// URL",
							"error",
						);
						return;
					}
					if (!ssl.httpsReady) {
						terminal.writeOutput(
							"Error: SSL handshake failed. The server doesn't have a certificate configured.",
							"error",
						);
						return;
					}
					const domain = getDomain();
					terminal.writeOutput(`CONNECTED(${Date.now() % 1000000})`);
					terminal.writeOutput("---");
					terminal.writeOutput("Certificate chain");
					terminal.writeOutput(` 0 s:${domain}`);
					terminal.writeOutput("   i:R3");
					terminal.writeOutput("---");
					terminal.writeOutput("Server certificate");
					terminal.writeOutput(`subject=${domain}`);
					terminal.writeOutput("issuer=Let's Encrypt Authority X3");
					terminal.writeOutput("---");
					terminal.writeOutput("Verify return code: 0 (ok)");
					return;
				}
				terminal.writeOutput("Available openssl commands: s_client");
				return;
			}

			if (command === "help" || command === "?") {
				terminal.writeOutput(
					"Available commands:\n" +
						"  curl <url>           Test HTTP/HTTPS connection\n" +
						"    curl http://example.com\n" +
						"    curl https://example.com\n" +
						"    curl -v https://example.com  (verbose)\n" +
						"    curl -I https://example.com  (headers only)\n\n" +
						"  openssl s_client <url>  View SSL certificate details\n" +
						"    openssl s_client https://example.com\n\n" +
						"  help                  Show this help message\n" +
						"  clear                 Clear terminal history",
				);
				return;
			}

			if (command === "clear") {
				terminal.clearHistory();
				return;
			}

			terminal.writeOutput(
				`Unknown command: ${command}. Type 'help' for available commands.`,
				"error",
			);
		},
	},
];

export const SSL_BEHAVIORS: BehaviorDefinition<SslBehaviorContext> = {
	initialContext: { certificateDomain: null, navigateAway: false },
	rules,
};
