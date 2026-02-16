import type { ItemDataConfig } from "../../domain/entity/entity-data";

/**
 * An entity template is a partial ItemDataConfig that can be stamped
 * to produce concrete entities with unique IDs.
 */
export type EntityTemplate = Omit<ItemDataConfig, "id"> & {
	/** Optional ID prefix for generated entities */
	idPrefix?: string;
};

/**
 * Stamp a template to produce a concrete ItemDataConfig with a unique ID.
 */
export const stampTemplate = (
	template: EntityTemplate,
	id: string,
	overrides?: Partial<Omit<ItemDataConfig, "id">>,
): ItemDataConfig => {
	return {
		...template,
		...overrides,
		id,
		allowedPlaces: overrides?.allowedPlaces ?? template.allowedPlaces,
		data: { ...template.data, ...overrides?.data },
	};
};

/**
 * Stamp multiple entities from a template with sequential IDs.
 * IDs are generated as `${prefix}-${index}`.
 */
export const stampBatch = (
	template: EntityTemplate,
	count: number,
	prefix?: string,
	perItemOverrides?: (
		index: number,
	) => Partial<Omit<ItemDataConfig, "id">> | undefined,
): ItemDataConfig[] => {
	const idPrefix = prefix ?? template.idPrefix ?? "entity";
	return Array.from({ length: count }, (_, i) => {
		const id = `${idPrefix}-${i}`;
		const overrides = perItemOverrides?.(i);
		return stampTemplate(template, id, overrides);
	});
};

/**
 * Create a spawn plan: template + placement instructions.
 * Used to declaratively describe entity creation in behavior handlers.
 */
export type SpawnPlan = {
	config: ItemDataConfig;
	spaceId?: string;
	position?: Record<string, unknown>;
};

/**
 * Execute a spawn plan using the world API.
 */
export const executeSpawnPlan = (
	plan: SpawnPlan,
	world: {
		createEntity: (config: ItemDataConfig) => unknown;
		addToSpace: (
			entityId: string,
			spaceId: string,
			position?: Record<string, unknown>,
		) => unknown;
	},
): void => {
	world.createEntity(plan.config);
	if (plan.spaceId) {
		world.addToSpace(plan.config.id, plan.spaceId, plan.position);
	}
};

/**
 * Execute multiple spawn plans.
 */
export const executeSpawnPlans = (
	plans: SpawnPlan[],
	world: {
		createEntity: (config: ItemDataConfig) => unknown;
		addToSpace: (
			entityId: string,
			spaceId: string,
			position?: Record<string, unknown>,
		) => unknown;
	},
): void => {
	for (const plan of plans) {
		executeSpawnPlan(plan, world);
	}
};
