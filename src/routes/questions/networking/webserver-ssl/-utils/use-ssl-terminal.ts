// Terminal command handler for the webserver-ssl question
// Supports curl and openssl commands for testing HTTP and HTTPS

import { useCallback, useMemo } from "react";
import { useAllCanvases, useGameDispatch } from "@/components/game/game-provider";
import type { TerminalCommandHelpers } from "@/components/game/engines/terminal/use-terminal-engine";
import { INDEX_HTML_CONTENT } from "./constants";
import { isPort443Complete, isPort80Complete, isPort80RedirectConfigured } from "./ssl-utils";
import { buildSuccessModal } from "./modal-builders";
import type { CanvasState } from "@/components/game/game-provider";

interface UseSslTerminalArgs {
	hasRedirect: boolean;
	port80Domain: string | undefined;
	certificateDomain: string | undefined;
	onQuestionComplete?: VoidFunction;
}

export const useSslTerminal = ({
	hasRedirect,
	port80Domain,
	certificateDomain,
	onQuestionComplete,
}: UseSslTerminalArgs) => {
	const dispatch = useGameDispatch();
	const canvases = useAllCanvases();
	const port80Canvas = useMemo(
		() => canvases["port-80"] as CanvasState | undefined,
		[canvases],
	);
	const port443Canvas = useMemo(
		() => canvases["port-443"] as CanvasState | undefined,
		[canvases],
	);

	return useCallback(
		(input: string, helpers: TerminalCommandHelpers) => {
			const trimmedInput = input.trim();
			if (trimmedInput.length === 0) return;

			const tokens = trimmedInput.split(/\s+/);
			const command = tokens[0]?.toLowerCase();

			const getDomain = () => port80Domain || certificateDomain || "example.com";

			const isHttpReady = isPort80Complete(port80Canvas);
			const isHttpsReadyNow = isPort443Complete(port443Canvas);
			const hasRedirectNow = isPort80RedirectConfigured(port80Canvas);

			// Handle curl command
			if (command === "curl") {
				// Handle --help flag
				if (tokens.includes("-h") || tokens.includes("--help")) {
					helpers.writeOutput(
						"Usage: curl [options] <url>\n\n" +
							"Options:\n" +
							"  -I, --head     Show document headers only\n" +
							"  -v, --verbose  Make the operation more talkative\n" +
							"  -k, --insecure  Allow insecure server connections (skip SSL)\n" +
							"\n" +
							"Examples:\n" +
							"  curl http://example.com\n" +
							"  curl https://example.com",
						"output",
					);
					return;
				}

				// Handle verbose flag
				const verbose = tokens.includes("-v") || tokens.includes("--verbose");
				const headOnly = tokens.includes("-I") || tokens.includes("--head");
				const insecure = tokens.includes("-k") || tokens.includes("--insecure");

				// Find URL (last argument or after flags)
				let url = "";
				for (let i = tokens.length - 1; i >= 1; i--) {
					if (tokens[i].startsWith("http://") || tokens[i].startsWith("https://")) {
						url = tokens[i];
						break;
					}
				}

				if (!url) {
					helpers.writeOutput("Error: No URL specified. Usage: curl <url>", "error");
					return;
				}

				const targetUrl = url.toLowerCase();

				// Handle http:// requests
				if (targetUrl.startsWith("http://")) {
					if (hasRedirect || hasRedirectNow) {
						const domain = getDomain();
						if (verbose) {
							helpers.writeOutput(`* Trying ${domain}...`, "output");
							helpers.writeOutput(`* Connected to ${domain} (127.0.0.1) port 80`, "output");
						}
						helpers.writeOutput("HTTP/1.1 301 Moved Permanently", "output");
						helpers.writeOutput(`Location: https://${domain}/`, "output");
						helpers.writeOutput("", "output");
						helpers.writeOutput("Redirecting to HTTPS...", "hint");
					} else if (isHttpReady) {
						if (verbose) {
							helpers.writeOutput(`* Trying ${getDomain()}...`, "output");
							helpers.writeOutput(`* Connected to ${getDomain()} (127.0.0.1) port 80`, "output");
						}
						helpers.writeOutput("HTTP/1.1 200 OK", "output");
						helpers.writeOutput("Content-Type: text/html", "output");
						if (!headOnly) {
							helpers.writeOutput("", "output");
							helpers.writeOutput(INDEX_HTML_CONTENT, "output");
						}
					} else {
						helpers.writeOutput("Error: Connection refused. Webserver not configured.", "error");
					}
					return;
				}

				// Handle https:// requests
				if (targetUrl.startsWith("https://")) {
					if (insecure) {
						helpers.writeOutput("Error: --insecure flag not supported in this simulation.", "error");
						return;
					}

					if (!isHttpsReadyNow) {
						helpers.writeOutput("Error: SSL handshake failed. Certificate not found.", "error");
						return;
					}

					const domain = getDomain();
					if (verbose) {
						helpers.writeOutput(`* Trying ${domain}:443...`, "output");
						helpers.writeOutput(`* Connected to ${domain} (127.0.0.1) port 443`, "output");
						helpers.writeOutput("* TLS 1.3 connection using TLS_AES_256_GCM_SHA384", "output");
						helpers.writeOutput("* Server certificate:", "output");
						helpers.writeOutput(`*  subject: ${domain}`, "output");
						helpers.writeOutput("*  issuer: Let's Encrypt Authority X3", "output");
						helpers.writeOutput("*  SSL certificate verify ok.", "output");
					}

					// Show TLS handshake success
					helpers.writeOutput("🔒 TLS Handshake successful", "hint");
					helpers.writeOutput(`   Certificate: ${domain}`, "output");
					helpers.writeOutput("   Issuer: Let's Encrypt", "output");
					helpers.writeOutput("", "output");

					// Show HTTP response
					helpers.writeOutput("HTTP/1.1 200 OK", "output");
					helpers.writeOutput("Content-Type: text/html", "output");
					if (!headOnly) {
						helpers.writeOutput("", "output");
						helpers.writeOutput(INDEX_HTML_CONTENT, "output");
					}

					// Complete the question only if fully configured with redirect
					if (isHttpsReadyNow && (hasRedirectNow || hasRedirect)) {
						dispatch({
							type: "OPEN_MODAL",
							payload: buildSuccessModal(onQuestionComplete),
						});
						helpers.finishEngine();
						dispatch({ type: "COMPLETE_QUESTION" });
					}
					return;
				}

				helpers.writeOutput("Error: Unknown URL scheme. Use http:// or https://", "error");
				return;
			}

			// Handle openssl command
			if (command === "openssl") {
				const subCommand = tokens[1]?.toLowerCase();

				if (subCommand === "s_client") {
					let url = "";
					for (let i = tokens.length - 1; i >= 2; i--) {
						if (tokens[i].startsWith("https://") || tokens[i].startsWith("http://")) {
							url = tokens[i];
							break;
						}
					}

					if (!url) {
						helpers.writeOutput("Usage: openssl s_client <url>", "output");
						return;
					}

					const targetUrl = url.toLowerCase();

					if (!targetUrl.startsWith("https://")) {
						helpers.writeOutput("Error: s_client requires an https:// URL", "error");
						return;
					}

					if (!isHttpsReadyNow) {
						helpers.writeOutput("Error: SSL handshake failed. The server doesn't have a certificate configured.", "error");
						return;
					}

					const domain = getDomain();
					helpers.writeOutput(`CONNECTED(${Date.now() % 1000000})`, "output");
					helpers.writeOutput("---", "output");
					helpers.writeOutput("Certificate chain", "output");
					helpers.writeOutput(` 0 s:${domain}`, "output");
					helpers.writeOutput("   i:R3", "output");
					helpers.writeOutput("---", "output");
					helpers.writeOutput(`Server certificate`, "output");
					helpers.writeOutput(`subject=${domain}`, "output");
					helpers.writeOutput("issuer=Let's Encrypt Authority X3", "output");
					helpers.writeOutput("---", "output");
					helpers.writeOutput("Verify return code: 0 (ok)", "hint");
					return;
				}

				helpers.writeOutput("Available openssl commands: s_client", "output");
				return;
			}

			// Handle help command
			if (command === "help" || command === "?") {
				helpers.writeOutput(
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
					"output",
				);
				return;
			}

			// Handle clear command
			if (command === "clear") {
				helpers.clearHistory();
				return;
			}

			helpers.writeOutput(`Unknown command: ${command}. Type 'help' for available commands.`, "error");
		},
		[
			hasRedirect,
			port80Domain,
			certificateDomain,
			dispatch,
			onQuestionComplete,
			port80Canvas,
			port443Canvas,
		],
	);
};
