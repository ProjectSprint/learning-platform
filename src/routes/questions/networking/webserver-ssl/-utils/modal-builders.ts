// Modal builders for the webserver-ssl question
// Creates ModalInstance objects for the data-driven modal system

import type {
	ModalAction,
	ModalActionContext,
	ModalContentBlock,
	ModalField,
	ModalFieldValidator,
	ModalInstance,
} from "@/components/game/presentation/modal";
import {
	DEFAULT_DOMAIN,
	INDEX_HTML_CONTENT,
	TLS_HANDSHAKE_STEPS,
} from "./constants";

// Domain validator
const validateDomain: ModalFieldValidator<string> = (input) => {
	if (!input || input.trim().length === 0) {
		return "Enter your domain name";
	}
	const domain = input.trim();
	const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/;
	if (!domainRegex.test(domain)) {
		return "Invalid domain format. Use: example.com";
	}
	return null;
};

// Close action helper
const closeAction = (): ModalAction => ({
	id: "close",
	label: "Close",
	variant: "primary",
	closesModal: true,
	validate: false,
});

// Build field helper
const buildField = (field: ModalField): ModalContentBlock => ({
	kind: "field",
	field,
});

// Build text helper
const buildText = (text: string): ModalContentBlock => ({
	kind: "text",
	text,
});

/**
 * Browser Status Modal
 */
export const buildBrowserStatusModal = (
	deviceId: string,
	status: { url?: string; connection?: string; port?: string },
	hasTlsHandshake?: boolean,
): ModalInstance => {
	const content: ModalContentBlock[] = [];

	// URL field
	content.push(
		buildField({
			id: "url",
			kind: "readonly",
			label: "URL",
			value: status.url || "Not connected",
		}),
	);

	// Connection status
	content.push(
		buildField({
			id: "connection",
			kind: "readonly",
			label: "Connection",
			value: status.connection || "Can't connect",
		}),
	);

	// Port
	content.push(
		buildField({
			id: "port",
			kind: "readonly",
			label: "Port",
			value: status.port || "—",
		}),
	);

	// Additional info based on status
	if (status.connection === "Can't connect") {
		content.push(buildText("\nNo webserver configured"));
	}

	if (status.connection?.includes("Not Secure")) {
		content.push(buildText("\n⚠️ Your connection is not private"));
	}

	if (status.connection?.includes("Secure")) {
		content.push(buildText(`\nCertificate: ${DEFAULT_DOMAIN}`));
		content.push(buildText("Issued by: Let's Encrypt"));
	}

	// TLS handshake visualization for HTTPS
	if (hasTlsHandshake) {
		content.push(
			buildText(
				`\n${TLS_HANDSHAKE_STEPS.map((s) => `${s.step}. ${s.phase} (${s.direction})`).join("\n")}`,
			),
		);
	}

	return {
		id: `browser-status-${deviceId}`,
		title: "Browser",
		content,
		actions: [closeAction()],
	};
};

/**
 * Webserver (Port 80) Status Modal
 */
export const buildWebserver80StatusModal = (
	deviceId: string,
	config: { status?: string; domain?: string; servingFile?: string },
): ModalInstance => {
	const content: ModalContentBlock[] = [
		buildField({
			id: "port",
			kind: "readonly",
			label: "Listening Port",
			value: "80",
		}),
		buildField({
			id: "status",
			kind: "readonly",
			label: "Status",
			value: config.status || "Not configured",
		}),
		buildField({
			id: "domain",
			kind: "readonly",
			label: "Domain",
			value: config.domain || "Not set",
		}),
		buildField({
			id: "documentRoot",
			kind: "readonly",
			label: "Document Root",
			value: "/var/www/html",
		}),
		buildField({
			id: "servingFile",
			kind: "readonly",
			label: "Serving",
			value: config.servingFile || "Nothing",
		}),
	];

	content.push(
		buildText(
			"\nPort 80 is the default port for HTTP (unencrypted) web traffic. Browsers automatically connect to port 80 when you type `http://` URLs.",
		),
	);

	return {
		id: `webserver-80-status-${deviceId}`,
		title: "Webserver Status (Port 80)",
		content,
		actions: [closeAction()],
	};
};

/**
 * Webserver (Port 443) Status Modal
 */
export const buildWebserver443StatusModal = (
	deviceId: string,
	config: {
		status?: string;
		domain?: string;
		privateKey?: string;
		certificate?: string;
		servingFile?: string;
	},
): ModalInstance => {
	const content: ModalContentBlock[] = [
		buildField({
			id: "port",
			kind: "readonly",
			label: "Listening Port",
			value: "443",
		}),
		buildField({
			id: "status",
			kind: "readonly",
			label: "Status",
			value: config.status || "Not configured",
		}),
		buildField({
			id: "domain",
			kind: "readonly",
			label: "Domain",
			value: config.domain || "Not set",
		}),
	];

	// SSL specific fields
	const hasPrivateKey = config.privateKey === "✓ Installed";
	const hasCertificate = config.certificate === "✓ Installed";

	content.push(
		buildField({
			id: "privateKey",
			kind: "readonly",
			label: "Private Key",
			value: hasPrivateKey ? "✓ Installed" : "Not installed",
		}),
		buildField({
			id: "certificate",
			kind: "readonly",
			label: "Domain Certificate",
			value: hasCertificate
				? `✓ Installed (${config.domain || "example.com"})`
				: "Not installed",
		}),
	);

	content.push(
		buildField({
			id: "servingFile",
			kind: "readonly",
			label: "Serving",
			value: config.servingFile || "Nothing",
		}),
	);

	content.push(
		buildText(
			"\nPort 443 is the default port for HTTPS (encrypted) web traffic. It requires an SSL certificate and private key to establish secure connections.",
		),
	);

	// SSL status indicator
	if (!hasPrivateKey && !hasCertificate) {
		content.push(
			buildText(
				"\n❌ Missing SSL\n   ├─ Private Key: Not installed\n   └─ Domain Certificate: Not installed",
			),
		);
	} else if (hasPrivateKey && !hasCertificate) {
		content.push(
			buildText(
				"\n⚠️ Incomplete SSL\n   ├─ Private Key: ✓ Installed\n   └─ Domain Certificate: Not installed",
			),
		);
	} else if (!hasPrivateKey && hasCertificate) {
		content.push(
			buildText(
				"\n⚠️ Incomplete SSL\n   ├─ Private Key: Not installed\n   └─ Domain Certificate: ✓ Installed",
			),
		);
	} else {
		content.push(
			buildText(
				`\n🔒 SSL Configured\n   ├─ Private Key: ✓ Installed\n   └─ Domain Certificate: ✓ Installed (${config.domain || "example.com"})`,
			),
		);
	}

	return {
		id: `webserver-443-status-${deviceId}`,
		title: "Webserver Status (Port 443)",
		content,
		actions: [closeAction()],
	};
};

/**
 * Certificate Request Modal (domain-based)
 */
export const buildCertificateRequestModal = (
	deviceId: string,
	currentDomain: string,
	certificateIssued: boolean,
	port80CanvasConfig?: Record<string, unknown>,
	onCertificateIssued?: (domain: string) => void,
): ModalInstance => {
	// If certificate already issued, show status view
	if (certificateIssued) {
		return {
			id: `certificate-status-${deviceId}`,
			title: "📜 Domain Certificate Status",
			content: [
				buildText(`Domain: ${currentDomain || DEFAULT_DOMAIN}`),
				buildText("Issuer: Let's Encrypt"),
				buildText("Status: ✅ Issued"),
				buildText("Type: RSA 2048-bit"),
				buildText(""),
				buildText(
					"The certificate is being used on your HTTPS webserver. Drag the Private Key and Domain Certificate items to the Port 443 canvas.",
				),
			],
			actions: [closeAction()],
		};
	}

	const existingPort80Domain =
		typeof port80CanvasConfig?.domain === "string"
			? port80CanvasConfig.domain
			: DEFAULT_DOMAIN;

	const actions: ModalAction[] = [
		{
			id: "cancel",
			label: "Cancel",
			variant: "ghost",
			closesModal: true,
			validate: false,
		},
		{
			id: "issue",
			label: "Issue Certificate",
			variant: "primary",
			validate: true,
			closesModal: true,
			onClick: async ({
				values,
				dispatch,
			}: ModalActionContext): Promise<void> => {
				const domain = String(values.domain ?? "").trim();

				if (!domain) {
					throw new Error("Enter your domain name");
				}

				// Validate against Port 80 domain
				if (domain !== existingPort80Domain) {
					throw new Error(`Domain must match: ${existingPort80Domain}`);
				}

				// Issue certificate on the domain item
				dispatch({
					type: "CONFIGURE_DEVICE",
					payload: {
						deviceId,
						config: {
							certificateIssued: true,
							verified: true,
							certificateDomain: domain,
						},
						puzzleId: "letsencrypt",
					},
				});

				// Persist certificate issuance in question-local state
				if (onCertificateIssued) {
					onCertificateIssued(domain);
				}

				// Show SSL items inventory
				dispatch({
					type: "UPDATE_INVENTORY_GROUP",
					payload: { id: "ssl-items", visible: true },
				});
			},
		},
	];

	const content: ModalContentBlock[] = [
		buildField({
			id: "domain",
			kind: "text",
			label: "Domain Name",
			placeholder: "example.com",
			defaultValue: currentDomain,
			validate: validateDomain,
		}),
	];

	content.push(
		buildText(
			"\n> Get a free SSL certificate from Let's Encrypt for your domain.",
		),
		buildText(
			`> To prove ownership, Let's Encrypt will verify: http://${DEFAULT_DOMAIN}/.well-known/acme-challenge/xxx`,
		),
		buildText(
			"\n> Make sure your Port 80 webserver is configured before requesting!",
		),
	);

	return {
		id: `certificate-request-${deviceId}`,
		title: "Request SSL Certificate",
		content,
		actions,
	};
};

/**
 * Private Key Info Modal
 */
export const buildPrivateKeyInfoModal = (
	deviceId: string,
	installed: boolean,
): ModalInstance => {
	return {
		id: `private-key-info-${deviceId}`,
		title: "Private Key",
		content: [
			buildText("🔑 Private Key for example.com"),
			buildText("\nThis is your server's SECRET key."),
			buildText("- Used to decrypt incoming HTTPS traffic"),
			buildText("- Must be installed on your webserver (port 443)"),
			buildText("- NEVER share this with anyone!"),
			buildText(
				`\nStatus: ${installed ? "Installed on server" : "In Inventory"}`,
			),
		],
		actions: [closeAction()],
	};
};

/**
 * Certificate Info Modal
 */
export const buildCertificateInfoModal = (
	deviceId: string,
	installed: boolean,
): ModalInstance => {
	return {
		id: `certificate-info-${deviceId}`,
		title: "Domain Certificate",
		content: [
			buildText("📜 Domain Certificate"),
			buildText("\nSubject: example.com"),
			buildText("Issuer: Let's Encrypt Authority X3"),
			buildText("Valid: 90 days"),
			buildText(
				"\nThis certificate is sent to browsers to prove your server's identity.",
			),
			buildText(
				"It contains your public key (browsers use this to encrypt data to you).",
			),
			buildText(
				`\nStatus: ${installed ? "Installed on server" : "In Inventory"}`,
			),
		],
		actions: [closeAction()],
	};
};

/**
 * Redirect Info Modal
 */
export const buildRedirectInfoModal = (deviceId: string): ModalInstance => {
	return {
		id: `redirect-info-${deviceId}`,
		title: "HTTP to HTTPS Redirect",
		content: [
			buildText("↪️ Redirect to HTTPS"),
			buildText("\nWhen a visitor goes to:"),
			buildText("  http://example.com"),
			buildText("\nThey will be automatically redirected to:"),
			buildText("  https://example.com"),
			buildText("\nThis ensures all visitors use the secure connection!"),
			buildText("\nServer response: HTTP 301 Moved Permanently"),
			buildText("Location: https://example.com/"),
		],
		actions: [closeAction()],
	};
};

/**
 * Index.html View Modal
 */
export const buildIndexHtmlViewModal = (deviceId: string): ModalInstance => {
	return {
		id: `index-html-view-${deviceId}`,
		title: "index.html",
		content: [buildText(INDEX_HTML_CONTENT)],
		actions: [closeAction()],
	};
};

/**
 * TLS Handshake Modal
 */
export const buildTlsHandshakeModal = (): ModalInstance => {
	const stepsText = TLS_HANDSHAKE_STEPS.map(
		(step) => `${step.step}. ${step.direction}: ${step.phase}`,
	).join("\n");

	return {
		id: "tls-handshake",
		title: "🔒 TLS Handshake Complete ✓",
		content: [
			buildText(
				"Your browser has established a secure connection with the server!\n",
			),
			buildText(stepsText),
			buildText(
				"\nThe connection is now encrypted. All data exchanged is secure!",
			),
		],
		actions: [closeAction()],
	};
};

/**
 * Success Modal
 */
export const buildSuccessModal = (
	onQuestionComplete?: VoidFunction,
): ModalInstance => {
	return {
		id: "success",
		title: "🔒 Website Secured!",
		content: [
			buildText(
				"Congratulations! You've successfully secured your website with HTTPS.",
			),
			buildText("\nYou learned:"),
			buildText(
				"- **Port 80 (HTTP)** serves unencrypted content - anyone can read it!",
			),
			buildText(
				"- **Port 443 (HTTPS)** serves encrypted content - only you and the server can read it",
			),
			buildText(
				"- **Let's Encrypt** is a free Certificate Authority that verifies domain ownership",
			),
			buildText(
				"- **Private Key** stays secret on your server (decrypts incoming data)",
			),
			buildText(
				"- **Certificate** is shared with browsers (proves your identity)",
			),
			buildText(
				"- **SSL Handshake** establishes a secure connection before any data is sent",
			),
			buildText(
				"- **HTTP→HTTPS Redirect** ensures all visitors use the secure connection",
			),
			buildText(
				"\nThe 🔒 in your browser means the certificate is valid and the connection is encrypted!",
			),
		],
		actions: [
			{
				id: "primary",
				label: "Next question",
				variant: "primary",
				validate: false,
				closesModal: true,
				onClick: onQuestionComplete ? () => onQuestionComplete() : undefined,
			},
		],
	};
};
