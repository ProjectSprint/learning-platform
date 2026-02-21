import {
	BehaviorDefinition,
	BehaviorRule,
	buildEntityArrivedTrigger,
	buildEntityClickTrigger,
	buildModalSubmitTrigger,
	buildTerminalInputTrigger,
	createEntityPayloadWriter,
	findEntitySpace,
	isGridSpace,
	type ModalSubmissionContract,
	parseModalSubmission,
	parseTerminalInput,
	type TerminalInputContract,
} from "@/components/game/engine/runtime";
import type { GameState } from "@/components/game/types/state";
import {
	DEFAULT_DOMAIN,
	INDEX_HTML_CONTENT,
	type WebSslSpaceKey,
} from "./constants";
import {
	buildBrowserStatusModal,
	buildCertificateInfoModal,
	buildCertificateRequestModal,
	buildIndexHtmlViewModal,
	buildPrivateKeyInfoModal,
	buildRedirectInfoModal,
	buildSuccessModal,
	buildWebserver80StatusModal,
	buildWebserver443StatusModal,
} from "./modal-builders";

export type SslBehaviorContext = {
	certificateDomain: string | null;
	navigateAway: boolean;
};

export type SslPhase = "setup" | "terminal" | "completed";
export type SslSpaceId =
	| WebSslSpaceKey
	| "inventory"
	| "ssl-setup"
	| "ssl-items";
export type SslEntityType =
	| "browser"
	| "webserver-80"
	| "domain"
	| "index-html"
	| "webserver-443"
	| "redirect-to-https"
	| "private-key"
	| "certificate";
type SslModalId = string;
type SslModalActionId = "issue" | "primary";

type SslTriggerSpec = {
	spaceId: SslSpaceId;
	entityType: SslEntityType;
	modalId: SslModalId;
	modalActionId: SslModalActionId;
	phase: SslPhase;
};

type CertificateIssueSubmission = {
	deviceId: string;
	domain: string;
};

type SslEntityDataByType = {
	domain: {
		certificateIssued: boolean;
		verified: boolean;
		certificateDomain: string;
	};
};

type SslTerminalCommand = {
	raw: string;
	command: string;
	tokens: string[];
};

const SSL_TERMINAL_COMMAND_CONTRACT: TerminalInputContract<SslTerminalCommand> =
	{
		parse: (input) => {
			const raw = input.trim();
			if (!raw) {
				return { ok: false, errors: ["empty command"] };
			}
			const tokens = raw.split(/\s+/);
			return {
				ok: true,
				value: {
					raw,
					command: tokens[0]?.toLowerCase() ?? "",
					tokens,
				},
			};
		},
	};

const CERTIFICATE_ISSUE_CONTRACT: ModalSubmissionContract<CertificateIssueSubmission> =
	{
		actionId: "issue",
		modalIdStartsWith: "certificate-request-",
		parse: (values, event) => {
			const deviceId = event.modalId.replace("certificate-request-", "");
			if (!deviceId) {
				return {
					ok: false,
					errors: ["certificate request modal must include device id"],
				};
			}
			const domain = String(values.domain ?? "").trim();
			if (!domain) {
				return { ok: false, errors: ["domain is required"] };
			}
			return { ok: true, value: { deviceId, domain } };
		},
	};

const SSL_SUCCESS_NAVIGATION_CONTRACT: ModalSubmissionContract<null> = {
	actionId: "primary",
	modalId: "success",
	parse: () => ({ ok: true, value: null }),
};

/** Derive SSL terminal state from game state. */
function deriveSslStatus(state: GameState) {
	const port80Raw = state.spaces["port-80"];
	const port80Space = port80Raw && isGridSpace(port80Raw) ? port80Raw : null;
	const port443Raw = state.spaces["port-443"];
	const port443Space =
		port443Raw && isGridSpace(port443Raw) ? port443Raw : null;

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

const rules = [
	BehaviorRule<SslBehaviorContext, SslTriggerSpec>({
		id: "ssl.browser-click",
		on: buildEntityClickTrigger("browser"),
		handler: ({ entity, state, interaction }) => {
			if (!entity) return;
			const ssl = deriveSslStatus(state);
			const browserStatus =
				ssl.httpsReady && ssl.hasRedirect
					? "success"
					: ssl.httpReady
						? "warning"
						: "error";
			const browserModalStatus =
				browserStatus === "success"
					? {
							url: `https://${ssl.port80Domain || DEFAULT_DOMAIN}`,
							connection: "Secure",
							port: "443",
						}
					: browserStatus === "warning"
						? {
								url: `http://${ssl.port80Domain || DEFAULT_DOMAIN}`,
								connection: "Not Secure",
								port: "80",
							}
						: {
								url: "Not connected",
								connection: "Can't connect",
								port: "-",
							};
			interaction.openModal(
				buildBrowserStatusModal(
					entity.id,
					browserModalStatus,
					browserStatus === "success",
				),
			);
		},
	}),
	BehaviorRule<SslBehaviorContext, SslTriggerSpec>({
		id: "ssl.webserver-80-click",
		on: buildEntityClickTrigger("webserver-80"),
		handler: ({ entity, state, interaction }) => {
			if (!entity) return;
			const ssl = deriveSslStatus(state);
			const port80Raw = state.spaces["port-80"];
			const port80Space =
				port80Raw && isGridSpace(port80Raw) ? port80Raw : null;
			const port80Types = port80Space
				? Object.keys(port80Space.entityPositions).map((entityId) => {
						const current = state.entities[entityId];
						return current?.type ?? "";
					})
				: [];
			const hasRedirect = port80Types.includes("redirect-to-https");
			const hasIndexHtml = port80Types.includes("index-html");
			const hasWebserver = port80Types.includes("webserver-80");
			const hasDomain = port80Types.includes("domain");
			const status =
				!hasWebserver || !hasDomain || (!hasIndexHtml && !hasRedirect)
					? "Not configured"
					: hasRedirect
						? "Redirecting to HTTPS"
						: "Serving HTTP";
			const servingFile = hasRedirect
				? "Redirect to HTTPS"
				: hasIndexHtml
					? "index.html"
					: undefined;
			interaction.openModal(
				buildWebserver80StatusModal(entity.id, {
					status,
					domain: ssl.port80Domain,
					servingFile,
				}),
			);
		},
	}),
	BehaviorRule<SslBehaviorContext, SslTriggerSpec>({
		id: "ssl.webserver-443-click",
		on: buildEntityClickTrigger("webserver-443"),
		handler: ({ entity, state, interaction }) => {
			if (!entity) return;
			const port443Raw = state.spaces["port-443"];
			const port443Space =
				port443Raw && isGridSpace(port443Raw) ? port443Raw : null;
			const port443Types = port443Space
				? Object.keys(port443Space.entityPositions).map((entityId) => {
						const current = state.entities[entityId];
						return current?.type ?? "";
					})
				: [];
			const hasWebserver = port443Types.includes("webserver-443");
			const hasDomain = port443Types.includes("domain");
			const hasIndexHtml = port443Types.includes("index-html");
			const hasPrivateKey = port443Types.includes("private-key");
			const hasCertificate = port443Types.includes("certificate");
			const status =
				!hasWebserver || !hasDomain || !hasIndexHtml
					? "Not configured"
					: hasPrivateKey && hasCertificate
						? "🔒 Serving HTTPS"
						: "Missing SSL";
			const ssl = deriveSslStatus(state);
			interaction.openModal(
				buildWebserver443StatusModal(entity.id, {
					status,
					domain: ssl.port80Domain,
					privateKey: hasPrivateKey ? "✓ Installed" : "Not installed",
					certificate: hasCertificate ? "✓ Installed" : "Not installed",
					servingFile: hasIndexHtml ? "index.html" : undefined,
				}),
			);
		},
	}),
	BehaviorRule<SslBehaviorContext, SslTriggerSpec>({
		id: "ssl.letsencrypt-domain-click",
		on: buildEntityClickTrigger("domain"),
		handler: ({ entity, state, context, interaction }) => {
			if (!entity) return;
			const spaceId = findEntitySpace(state, entity.id);
			if (spaceId !== "letsencrypt") return;
			const issued =
				typeof entity.data?.certificateIssued === "boolean"
					? entity.data.certificateIssued
					: false;
			const domainName = issued
				? context.certificateDomain || DEFAULT_DOMAIN
				: typeof entity.data?.domain === "string"
					? entity.data.domain
					: DEFAULT_DOMAIN;
			interaction.openModal(
				buildCertificateRequestModal(entity.id, domainName, issued, {
					domain: DEFAULT_DOMAIN,
				}),
			);
		},
	}),
	BehaviorRule<SslBehaviorContext, SslTriggerSpec>({
		id: "ssl.index-click",
		on: buildEntityClickTrigger("index-html"),
		handler: ({ entity, interaction }) => {
			if (!entity) return;
			interaction.openModal(buildIndexHtmlViewModal(entity.id));
		},
	}),
	BehaviorRule<SslBehaviorContext, SslTriggerSpec>({
		id: "ssl.private-key-click",
		on: buildEntityClickTrigger("private-key"),
		handler: ({ entity, state, interaction }) => {
			if (!entity) return;
			const installed = findEntitySpace(state, entity.id) === "port-443";
			interaction.openModal(buildPrivateKeyInfoModal(entity.id, installed));
		},
	}),
	BehaviorRule<SslBehaviorContext, SslTriggerSpec>({
		id: "ssl.certificate-click",
		on: buildEntityClickTrigger("certificate"),
		handler: ({ entity, state, interaction }) => {
			if (!entity) return;
			const installed = findEntitySpace(state, entity.id) === "port-443";
			interaction.openModal(buildCertificateInfoModal(entity.id, installed));
		},
	}),
	BehaviorRule<SslBehaviorContext, SslTriggerSpec>({
		id: "ssl.redirect-click",
		on: buildEntityClickTrigger("redirect-to-https"),
		handler: ({ entity, interaction }) => {
			if (!entity) return;
			interaction.openModal(buildRedirectInfoModal(entity.id));
		},
	}),
	BehaviorRule<SslBehaviorContext, SslTriggerSpec>({
		id: "ssl.phase-terminal-ready.port-80",
		on: buildEntityArrivedTrigger("port-80"),
		guard: ({ state, phase }) => {
			const ssl = deriveSslStatus(state);
			return ssl.httpsReady && ssl.hasRedirect && phase !== "terminal";
		},
		handler: ({ setPhase }) => {
			setPhase("terminal", "ssl.behavior");
		},
	}),
	BehaviorRule<SslBehaviorContext, SslTriggerSpec>({
		id: "ssl.phase-terminal-ready.port-443",
		on: buildEntityArrivedTrigger("port-443"),
		guard: ({ state, phase }) => {
			const ssl = deriveSslStatus(state);
			return ssl.httpsReady && ssl.hasRedirect && phase !== "terminal";
		},
		handler: ({ setPhase }) => {
			setPhase("terminal", "ssl.behavior");
		},
	}),
	BehaviorRule<SslBehaviorContext, SslTriggerSpec>({
		id: "ssl.certificate-issue",
		on: buildModalSubmitTrigger(undefined, "issue"),
		handler: ({ event, world, updateContext }) => {
			const parsed = parseModalSubmission(event, CERTIFICATE_ISSUE_CONTRACT);
			if (!parsed || !parsed.ok) {
				return;
			}

			const { deviceId, domain } = parsed.value;
			const payloadWriter = createEntityPayloadWriter<
				SslEntityDataByType,
				Record<string, never>
			>(world);
			payloadWriter.updateData(deviceId, "domain", {
				certificateIssued: true,
				verified: true,
				certificateDomain: domain,
			});

			updateContext((ctx) => {
				ctx.certificateDomain = domain;
			});
		},
	}),
	BehaviorRule<SslBehaviorContext, SslTriggerSpec>({
		id: "ssl.success-modal-navigate",
		on: buildModalSubmitTrigger("success", "primary"),
		handler: ({ event, updateContext }) => {
			const parsed = parseModalSubmission(
				event,
				SSL_SUCCESS_NAVIGATION_CONTRACT,
			);
			if (!parsed || !parsed.ok) {
				return;
			}
			updateContext((ctx) => {
				ctx.navigateAway = true;
			});
		},
	}),
	BehaviorRule<SslBehaviorContext, SslTriggerSpec>({
		id: "ssl.terminal-onboarding",
		on: { event: "PHASE_CHANGED", to: "terminal" },
		handler: ({ state, context, schedule, once }) => {
			once("ssl.terminal.onboarding", () => {
				schedule("ssl.terminal.onboarding.delay", 100, ({ terminal }) => {
					const ssl = deriveSslStatus(state);
					const domain =
						ssl.port80Domain || context.certificateDomain || DEFAULT_DOMAIN;
					const helpLines = [
						"Terminal - SSL diagnostic utility",
						"",
						"----",
						"",
						"SYNOPSIS",
						"curl [url]",
						"openssl s_client [url]",
						"help",
						"",
						"----",
						"",
						"COMMANDS",
						`curl http://${domain}`,
						`curl https://${domain}`,
						`curl -v https://${domain}`,
						`curl -I https://${domain}`,
						`openssl s_client https://${domain}`,
						"help",
						"clear",
						"",
					];

					for (const line of helpLines) {
						terminal.writeOutput(line);
					}
				});
			});
		},
	}),

	// --- Terminal commands ---
	BehaviorRule<SslBehaviorContext, SslTriggerSpec>({
		id: "ssl.terminal-command",
		on: buildTerminalInputTrigger(),
		guard: ({ state }) => state.question.status !== "completed",
		handler: ({ event, state, context, terminal, interaction, progress }) => {
			const parsed = parseTerminalInput(event, SSL_TERMINAL_COMMAND_CONTRACT);
			if (!parsed || !parsed.ok) {
				return;
			}

			const { command, tokens } = parsed.value;
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
	}),
];

export const SSL_BEHAVIORS = BehaviorDefinition<
	SslBehaviorContext,
	SslTriggerSpec
>({
	initialContext: { certificateDomain: null, navigateAway: false },
	rules,
});
