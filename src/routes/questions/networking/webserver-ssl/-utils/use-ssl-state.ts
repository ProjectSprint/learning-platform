// State management for the webserver-ssl question
// Tracks canvas states, inventory visibility, and game progression

import { useEffect, useCallback, useMemo } from "react";
import {
	useAllCanvases,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";
import { DEFAULT_DOMAIN, DEFAULT_INDEX_HTML } from "./constants";
import {
	getBrowserStatus,
	getCertificateDomain,
	getDomainFromCanvas,
	isPort443Complete,
	isPort80Complete,
	isPort80RedirectConfigured,
} from "./ssl-utils";

export const useSslState = () => {
	const state = useGameState();
	const canvases = useAllCanvases();
	const dispatch = useGameDispatch();

	// Canvas states
	const browserCanvas = canvases.browser;
	const port80Canvas = canvases["port-80"];
	const letsencryptCanvas = canvases.letsencrypt;
	const port443Canvas = canvases["port-443"];

	// Helper to dispatch device config to a canvas
	const dispatchConfig = useCallback(
		(deviceId: string, config: Record<string, unknown>) => {
			// Find which canvas this device is in
			for (const [key, canvas] of Object.entries(canvases)) {
				const item = canvas.placedItems.find((i) => i.id === deviceId);
				if (item) {
					dispatch({
						type: "CONFIGURE_DEVICE",
						payload: {
							deviceId,
							config,
							canvasId: key,
						},
					});
					return;
				}
			}
		},
		[canvases, dispatch],
	);

	// All placed items across all canvases
	const allPlacedItems = useMemo(() => {
		const items: Array<{ type: string; id: string }> = [];
		Object.values(canvases).forEach((canvas) => {
			canvas.placedItems.forEach((item) => {
				items.push({ type: item.type, id: item.id });
			});
		});
		return items;
	}, [canvases]);

	// Browser status
	const browserStatus = useMemo(
		() => getBrowserStatus(browserCanvas, port80Canvas, port443Canvas),
		[browserCanvas, port80Canvas, port443Canvas],
	);

	// Port 80 domain
	const port80Domain = useMemo(() => getDomainFromCanvas(port80Canvas), [port80Canvas]);

	// Certificate domain from letsencrypt canvas (domain item)
	const certificateDomain = useMemo(
		() => getCertificateDomain(letsencryptCanvas),
		[letsencryptCanvas],
	);

	// HTTP ready - Port 80 is configured
	const httpReady = useMemo(() => isPort80Complete(port80Canvas), [port80Canvas]);

	// HTTPS ready - Port 443 is fully configured
	const httpsReady = useMemo(() => isPort443Complete(port443Canvas), [port443Canvas]);

	// Has redirect on Port 80
	const hasRedirect = useMemo(() => isPort80RedirectConfigured(port80Canvas), [port80Canvas]);

	// Certificate issued
	const certificateIssued = useMemo(() => {
		const domainItem = letsencryptCanvas?.placedItems.find(
			(i) => i.type === "domain",
		);
		return !!domainItem?.data?.certificateIssued;
	}, [letsencryptCanvas]);

	// Sync SSL domain status with certificate issuance
	useEffect(() => {
		if (!letsencryptCanvas) return;
		const domainItem = letsencryptCanvas.placedItems.find(
			(item) => item.type === "domain",
		);
		if (!domainItem) return;

		const nextStatus = certificateIssued ? "success" : "error";
		if (domainItem.status !== nextStatus) {
			dispatchConfig(domainItem.id, { status: nextStatus });
		}
	}, [certificateIssued, dispatchConfig, letsencryptCanvas]);


	// Port 80 config state
	const port80Config = useMemo(() => {
		const types = port80Canvas?.placedItems.map((i) => i.type) ?? [];
		return {
			hasWebserver: types.includes("webserver-80"),
			hasDomain: types.includes("domain"),
			hasIndexHtml: types.includes("index-html"),
			isComplete: isPort80Complete(port80Canvas),
		};
	}, [port80Canvas]);

	// Port 443 SSL status
	const port443SslStatus = useMemo(() => {
		const types = port443Canvas?.placedItems.map((i) => i.type) ?? [];
		return {
			hasWebserver: types.includes("webserver-443"),
			hasDomain: types.includes("domain"),
			hasIndexHtml: types.includes("index-html"),
			hasPrivateKey: types.includes("private-key"),
			hasCertificate: types.includes("certificate"),
			isComplete: isPort443Complete(port443Canvas),
		};
	}, [port443Canvas]);

	// Let's Encrypt modal open state
	const letsencryptModalOpen = useMemo(
		() =>
			(state.overlay?.activeModal?.id?.includes("letsencrypt") ||
				state.overlay?.activeModal?.id?.includes("certificate")) ??
			false,
		[state.overlay],
	);

	// Update browser status and domain data
	useEffect(() => {
		if (state.question.status === "completed") {
			return;
		}

		if (browserCanvas) {
			const browserItem = browserCanvas.placedItems.find((item) => item.type === "browser");
			if (browserItem) {
				// Update status
				if (browserItem.status !== browserStatus) {
					dispatchConfig(browserItem.id, { status: browserStatus });
				}

				// Update domain data - default to "example.com" if not set
				const currentDomain = typeof browserItem.data?.domain === "string" ? browserItem.data.domain : null;
				const targetDomain = port80Domain ?? DEFAULT_DOMAIN;
				if (currentDomain !== targetDomain) {
					dispatchConfig(browserItem.id, { domain: targetDomain });
				}
			}
		}
	}, [browserCanvas, browserStatus, port80Domain, dispatchConfig, state.question.status]);

	// Update webserver status/config data
	useEffect(() => {
		if (state.question.status === "completed") {
			return;
		}

		if (port80Canvas) {
			const webserver = port80Canvas.placedItems.find(
				(item) => item.type === "webserver-80",
			);

			if (webserver) {
				const types = port80Canvas.placedItems.map((item) => item.type);
				const hasDomain = types.includes("domain");
				const hasIndexHtml = types.includes("index-html");
				const hasRedirect = types.includes("redirect-to-https");
				const isComplete = isPort80Complete(port80Canvas);

				let nextStatus: "error" | "warning" | "success" = "error";
				let stateLabel = "Not configured";

				if (isComplete && hasRedirect) {
					nextStatus = "success";
					stateLabel = "Redirecting to HTTPS";
				} else if (isComplete) {
					nextStatus = "warning";
					stateLabel = "Serving HTTP";
				}

				const nextDomain = hasDomain ? getDomainFromCanvas(port80Canvas) : null;
				const nextServingFile = hasRedirect
					? "Redirect to HTTPS"
					: hasIndexHtml
						? DEFAULT_INDEX_HTML
						: null;

				const currentState =
					typeof webserver.data?.state === "string" ? webserver.data.state : null;
				const currentDomain =
					typeof webserver.data?.domain === "string" ? webserver.data.domain : null;
				const currentServingFile =
					typeof webserver.data?.servingFile === "string"
						? webserver.data.servingFile
						: null;

				if (
					webserver.status !== nextStatus ||
					currentState !== stateLabel ||
					currentDomain !== nextDomain ||
					currentServingFile !== nextServingFile
				) {
					dispatchConfig(webserver.id, {
						status: nextStatus,
						state: stateLabel,
						domain: nextDomain,
						servingFile: nextServingFile,
					});
				}
			}
		}

		if (port443Canvas) {
			const webserver = port443Canvas.placedItems.find(
				(item) => item.type === "webserver-443",
			);

			if (webserver) {
				const types = port443Canvas.placedItems.map((item) => item.type);
				const hasDomain = types.includes("domain");
				const hasIndexHtml = types.includes("index-html");
				const hasPrivateKey = types.includes("private-key");
				const hasCertificate = types.includes("certificate");

				const hasBasics = hasDomain && hasIndexHtml;
				const hasSsl = hasPrivateKey && hasCertificate;

				let nextStatus: "error" | "warning" | "success" = "error";
				let stateLabel = "Not configured";

				if (hasBasics && hasSsl) {
					nextStatus = "success";
					stateLabel = "Serving HTTPS";
				} else if (hasBasics) {
					nextStatus = "warning";
					stateLabel = "Missing SSL";
				}

				const nextDomain = hasDomain ? getDomainFromCanvas(port443Canvas) : null;
				const nextServingFile = hasIndexHtml ? DEFAULT_INDEX_HTML : null;
				const nextPrivateKey = hasPrivateKey ? "✓ Installed" : null;
				const nextCertificate = hasCertificate ? "✓ Installed" : null;

				const currentState =
					typeof webserver.data?.state === "string" ? webserver.data.state : null;
				const currentDomain =
					typeof webserver.data?.domain === "string" ? webserver.data.domain : null;
				const currentServingFile =
					typeof webserver.data?.servingFile === "string"
						? webserver.data.servingFile
						: null;
				const currentPrivateKey =
					typeof webserver.data?.privateKey === "string"
						? webserver.data.privateKey
						: null;
				const currentCertificate =
					typeof webserver.data?.certificate === "string"
						? webserver.data.certificate
						: null;

				if (
					webserver.status !== nextStatus ||
					currentState !== stateLabel ||
					currentDomain !== nextDomain ||
					currentServingFile !== nextServingFile ||
					currentPrivateKey !== nextPrivateKey ||
					currentCertificate !== nextCertificate
				) {
					dispatchConfig(webserver.id, {
						status: nextStatus,
						state: stateLabel,
						domain: nextDomain,
						privateKey: nextPrivateKey,
						certificate: nextCertificate,
						servingFile: nextServingFile,
					});
				}
			}
		}
	}, [dispatchConfig, port443Canvas, port80Canvas, state.question.status]);

	// Update index.html status when webserver-443 is placed
	useEffect(() => {
		if (state.question.status === "completed") {
			return;
		}

		if (port80Canvas && port443Canvas) {
			const indexHtmlInPort80 = port80Canvas.placedItems.find(
				(item) => item.type === "index-html",
			);
			const port443Types = port443Canvas.placedItems.map((item) => item.type);
			const hasWebserver443 = port443Types.includes("webserver-443");
			const hasDomain = port443Types.includes("domain");
			const hasPrivateKey = port443Types.includes("private-key");
			const hasCertificate = port443Types.includes("certificate");
			const httpsConfigured =
				hasWebserver443 && hasDomain && hasPrivateKey && hasCertificate;

			if (indexHtmlInPort80 && httpsConfigured) {
				// Set status to warning to show "I shouldn't be here"
				if (indexHtmlInPort80.status !== "warning") {
					dispatchConfig(indexHtmlInPort80.id, { status: "warning" });
				}
			} else if (indexHtmlInPort80) {
				// Reset status if HTTPS isn't fully configured
				if (indexHtmlInPort80.status === "warning") {
					dispatchConfig(indexHtmlInPort80.id, { status: null });
				}
			}
		}
	}, [dispatchConfig, port80Canvas, port443Canvas, state.question.status]);

	// Reset letsencrypt data when domain item is not placed
	useEffect(() => {
		if (letsencryptCanvas) {
			const domainItem = letsencryptCanvas.placedItems.find(
				(item) => item.type === "domain",
			);
			if (!domainItem) {
				// Reset certificateIssued state in the canvas config if applicable
				// Note: This would need a RESET_CANVAS_CONFIG action which doesn't exist
				// For now, the data lives on the placed item
			}
		}
	}, [letsencryptCanvas]);

	return {
		browserCanvas,
		port80Canvas,
		letsencryptCanvas,
		port443Canvas,
		allPlacedItems,
		httpReady,
		httpsReady,
		hasRedirect,
		certificateIssued,
		browserStatus,
		port80Domain,
		certificateDomain,
		port80Config,
		port443SslStatus,
		letsencryptModalOpen,
		dispatch,
		state,
	};
};
