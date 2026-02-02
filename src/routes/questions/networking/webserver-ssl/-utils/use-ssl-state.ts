/**
 * SSL state hook adapted for new Space/Entity model.
 * Simplified version that provides minimal state for rendering.
 */

import { useCallback, useMemo } from "react";
import type { EntityData } from "@/components/game/domain/entity/entity-data";
import type { GridSpaceData } from "@/components/game/domain/space/space-data";
import { spaceContains } from "@/components/game/domain/space/space-fns";
import { useGameState } from "@/components/game/game-provider";
import { DEFAULT_DOMAIN } from "./constants";

export const useSslState = () => {
	const state = useGameState();

	// Get canvas spaces
	const browserCanvas =
		state.spaces.browser?.kind === "grid" ? state.spaces.browser : undefined;
	const port80Canvas =
		state.spaces["port-80"]?.kind === "grid"
			? state.spaces["port-80"]
			: undefined;
	const letsencryptCanvas =
		state.spaces.letsencrypt?.kind === "grid"
			? state.spaces.letsencrypt
			: undefined;
	const port443Canvas =
		state.spaces["port-443"]?.kind === "grid"
			? state.spaces["port-443"]
			: undefined;

	// Get entities in each canvas
	const getEntitiesInSpace = useCallback(
		(space: GridSpaceData | undefined) => {
			if (!space) return [];
			const entities: EntityData[] = [];
			for (const entity of Object.values(state.entities)) {
				if (spaceContains(space, entity.id)) {
					entities.push(entity);
				}
			}
			return entities;
		},
		[state.entities],
	);

	const browserEntities = useMemo(
		() => getEntitiesInSpace(browserCanvas),
		[browserCanvas, getEntitiesInSpace],
	);
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
	const domainEntities = useMemo(
		() =>
			Object.values(state.entities).filter(
				(entity) => entity.type === "domain",
			),
		[state.entities],
	);
	const browserItems = useMemo(
		() => browserEntities.map((entity) => entity.type),
		[browserEntities],
	);
	const port80Items = useMemo(
		() => port80Entities.map((entity) => entity.type),
		[port80Entities],
	);
	const letsencryptItems = useMemo(
		() => letsencryptEntities.map((entity) => entity.type),
		[letsencryptEntities],
	);
	const port443Items = useMemo(
		() => port443Entities.map((entity) => entity.type),
		[port443Entities],
	);

	// Derive state from entities
	const httpReady = useMemo(() => {
		const types = port80Entities.map((e) => e.type);
		const hasContent =
			types.includes("index-html") || types.includes("redirect-to-https");
		return (
			types.includes("webserver-80") && types.includes("domain") && hasContent
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
		return (
			types.includes("webserver-80") &&
			types.includes("domain") &&
			types.includes("redirect-to-https")
		);
	}, [port80Entities]);

	const issuedDomainEntity = useMemo(
		() =>
			domainEntities.find(
				(entity) =>
					(entity.data?.certificateIssued as boolean | undefined) === true,
			),
		[domainEntities],
	);

	const certificateIssued = Boolean(issuedDomainEntity);

	const browserStatus: "error" | "warning" | "success" = useMemo(() => {
		const browserPlaced = browserEntities.some((e) => e.type === "browser");
		if (!browserPlaced) return "error";
		if (httpsReady && hasRedirect) return "success";
		if (httpReady) return "warning";
		return "error";
	}, [browserEntities, hasRedirect, httpReady, httpsReady]);

	const port80Domain = useMemo(() => {
		const domainEntity = port80Entities.find((e) => e.type === "domain");
		if (typeof domainEntity?.data.domain === "string") {
			return domainEntity.data.domain;
		}
		return DEFAULT_DOMAIN;
	}, [port80Entities]);

	const port443Domain = useMemo(() => {
		const domainEntity = port443Entities.find((e) => e.type === "domain");
		if (typeof domainEntity?.data.domain === "string") {
			return domainEntity.data.domain;
		}
		return DEFAULT_DOMAIN;
	}, [port443Entities]);

	const certificateDomain = useMemo(() => {
		if (issuedDomainEntity) {
			if (typeof issuedDomainEntity.data?.certificateDomain === "string") {
				return issuedDomainEntity.data.certificateDomain;
			}
			if (typeof issuedDomainEntity.data?.domain === "string") {
				return issuedDomainEntity.data.domain;
			}
		}
		const letsencryptDomain = letsencryptEntities.find(
			(entity) => entity.type === "domain",
		);
		if (typeof letsencryptDomain?.data.domain === "string") {
			return letsencryptDomain.data.domain;
		}
		return DEFAULT_DOMAIN;
	}, [issuedDomainEntity, letsencryptEntities]);

	const port80Config = useMemo(() => {
		const types = port80Entities.map((e) => e.type);
		return {
			hasWebserver: types.includes("webserver-80"),
			hasDomain: types.includes("domain"),
			hasIndexHtml: types.includes("index-html"),
			hasRedirect: types.includes("redirect-to-https"),
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
			Object.values(state.overlay.modals).some(
				(entry) =>
					entry.visible &&
					(entry.instance.id?.includes("letsencrypt") ||
						entry.instance.id?.includes("certificate")),
			),
		[state.overlay],
	);

	return {
		browserCanvas,
		port80Canvas,
		letsencryptCanvas,
		port443Canvas,
		browserItems,
		port80Items,
		letsencryptItems,
		port443Items,
		httpReady,
		httpsReady,
		hasRedirect,
		certificateIssued,
		browserStatus,
		port80Domain,
		port443Domain,
		certificateDomain,
		port80Config,
		port443SslStatus,
		letsencryptModalOpen,
		state,
	};
};
