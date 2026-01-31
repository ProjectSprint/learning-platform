/**
 * SSL state hook adapted for new Space/Entity model.
 * Simplified version that provides minimal state for rendering.
 */

import { useCallback, useMemo } from "react";
import type { Entity } from "@/components/game/domain/entity/Entity";
import type { GridSpace } from "@/components/game/domain/space";
import { useGameState } from "@/components/game/game-provider";

export const useSslState = () => {
	const state = useGameState();

	// Get canvas spaces
	const browserCanvas = state.spaces.get("browser") as GridSpace | undefined;
	const port80Canvas = state.spaces.get("port-80") as GridSpace | undefined;
	const letsencryptCanvas = state.spaces.get("letsencrypt") as
		| GridSpace
		| undefined;
	const port443Canvas = state.spaces.get("port-443") as GridSpace | undefined;

	// Get entities in each canvas
	const getEntitiesInSpace = useCallback(
		(space: GridSpace | undefined) => {
			if (!space) return [];
			const entities: Entity[] = [];
			for (const entity of state.entities.values()) {
				if (space.contains(entity)) {
					entities.push(entity);
				}
			}
			return entities;
		},
		[state.entities],
	);

	getEntitiesInSpace(browserCanvas);
	const port80Entities = useMemo(
		() => getEntitiesInSpace(port80Canvas),
		[port80Canvas, getEntitiesInSpace],
	);
	const letsencryptEntities = useMemo(
		() => getEntitiesInSpace(letsencryptCanvas),
		[letsencryptCanvas, getEntitiesInSpace],
	);
	const port443Entities = useMemo(
		() => getEntitiesInSpace(port443Canvas),
		[port443Canvas, getEntitiesInSpace],
	);

	// Derive state from entities
	const httpReady = useMemo(() => {
		const types = port80Entities.map((e) => e.type);
		return (
			types.includes("webserver-80") &&
			types.includes("domain") &&
			types.includes("index-html")
		);
	}, [port80Entities]);

	const httpsReady = useMemo(() => {
		const types = port443Entities.map((e) => e.type);
		return (
			types.includes("webserver-443") &&
			types.includes("domain") &&
			types.includes("index-html") &&
			types.includes("private-key") &&
			types.includes("certificate")
		);
	}, [port443Entities]);

	const hasRedirect = useMemo(() => {
		const types = port80Entities.map((e) => e.type);
		return types.includes("redirect-to-https");
	}, [port80Entities]);

	const certificateIssued = useMemo(() => {
		const domainEntity = letsencryptEntities.find((e) => e.type === "domain");
		return domainEntity?.getStateValue("certificateIssued") === true;
	}, [letsencryptEntities]);

	const browserStatus: "error" | "warning" | "success" = useMemo(() => {
		if (httpsReady) return "success";
		if (httpReady) return "warning";
		return "error";
	}, [httpReady, httpsReady]);

	const port80Domain = useMemo(() => {
		const domainEntity = port80Entities.find((e) => e.type === "domain");
		return domainEntity?.name ?? "example.com";
	}, [port80Entities]);

	const certificateDomain = useMemo(() => {
		const domainEntity = letsencryptEntities.find((e) => e.type === "domain");
		return domainEntity?.name ?? "example.com";
	}, [letsencryptEntities]);

	const port80Config = useMemo(() => {
		const types = port80Entities.map((e) => e.type);
		return {
			hasWebserver: types.includes("webserver-80"),
			hasDomain: types.includes("domain"),
			hasIndexHtml: types.includes("index-html"),
			isComplete: httpReady,
		};
	}, [port80Entities, httpReady]);

	const port443SslStatus = useMemo(() => {
		const types = port443Entities.map((e) => e.type);
		return {
			hasWebserver: types.includes("webserver-443"),
			hasDomain: types.includes("domain"),
			hasIndexHtml: types.includes("index-html"),
			hasPrivateKey: types.includes("private-key"),
			hasCertificate: types.includes("certificate"),
			isComplete: httpsReady,
		};
	}, [port443Entities, httpsReady]);

	const letsencryptModalOpen = useMemo(
		() =>
			(state.overlay?.activeModal?.id?.includes("letsencrypt") ||
				state.overlay?.activeModal?.id?.includes("certificate")) ??
			false,
		[state.overlay],
	);

	return {
		browserCanvas,
		port80Canvas,
		letsencryptCanvas,
		port443Canvas,
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
		state,
	};
};
