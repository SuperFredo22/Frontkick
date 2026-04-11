declare module 'astro:content' {
	interface RenderResult {
		Content: import('astro/runtime/server/index.js').AstroComponentFactory;
		headings: import('astro').MarkdownHeading[];
		remarkPluginFrontmatter: Record<string, any>;
	}
	interface Render {
		'.md': Promise<RenderResult>;
	}

	export interface RenderedContent {
		html: string;
		metadata?: {
			imagePaths: Array<string>;
			[key: string]: unknown;
		};
	}
}

declare module 'astro:content' {
	type Flatten<T> = T extends { [K: string]: infer U } ? U : never;

	export type CollectionKey = keyof AnyEntryMap;
	export type CollectionEntry<C extends CollectionKey> = Flatten<AnyEntryMap[C]>;

	export type ContentCollectionKey = keyof ContentEntryMap;
	export type DataCollectionKey = keyof DataEntryMap;

	type AllValuesOf<T> = T extends any ? T[keyof T] : never;
	type ValidContentEntrySlug<C extends keyof ContentEntryMap> = AllValuesOf<
		ContentEntryMap[C]
	>['slug'];

	/** @deprecated Use `getEntry` instead. */
	export function getEntryBySlug<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		// Note that this has to accept a regular string too, for SSR
		entrySlug: E,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;

	/** @deprecated Use `getEntry` instead. */
	export function getDataEntryById<C extends keyof DataEntryMap, E extends keyof DataEntryMap[C]>(
		collection: C,
		entryId: E,
	): Promise<CollectionEntry<C>>;

	export function getCollection<C extends keyof AnyEntryMap, E extends CollectionEntry<C>>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => entry is E,
	): Promise<E[]>;
	export function getCollection<C extends keyof AnyEntryMap>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => unknown,
	): Promise<CollectionEntry<C>[]>;

	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(entry: {
		collection: C;
		slug: E;
	}): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(entry: {
		collection: C;
		id: E;
	}): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		slug: E,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(
		collection: C,
		id: E,
	): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;

	/** Resolve an array of entry references from the same collection */
	export function getEntries<C extends keyof ContentEntryMap>(
		entries: {
			collection: C;
			slug: ValidContentEntrySlug<C>;
		}[],
	): Promise<CollectionEntry<C>[]>;
	export function getEntries<C extends keyof DataEntryMap>(
		entries: {
			collection: C;
			id: keyof DataEntryMap[C];
		}[],
	): Promise<CollectionEntry<C>[]>;

	export function render<C extends keyof AnyEntryMap>(
		entry: AnyEntryMap[C][string],
	): Promise<RenderResult>;

	export function reference<C extends keyof AnyEntryMap>(
		collection: C,
	): import('astro/zod').ZodEffects<
		import('astro/zod').ZodString,
		C extends keyof ContentEntryMap
			? {
					collection: C;
					slug: ValidContentEntrySlug<C>;
				}
			: {
					collection: C;
					id: keyof DataEntryMap[C];
				}
	>;
	// Allow generic `string` to avoid excessive type errors in the config
	// if `dev` is not running to update as you edit.
	// Invalid collection names will be caught at build time.
	export function reference<C extends string>(
		collection: C,
	): import('astro/zod').ZodEffects<import('astro/zod').ZodString, never>;

	type ReturnTypeOrOriginal<T> = T extends (...args: any[]) => infer R ? R : T;
	type InferEntrySchema<C extends keyof AnyEntryMap> = import('astro/zod').infer<
		ReturnTypeOrOriginal<Required<ContentConfig['collections'][C]>['schema']>
	>;

	type ContentEntryMap = {
		"articles": {
"10-soumissions-efficaces-mma.md": {
	id: "10-soumissions-efficaces-mma.md";
  slug: "10-soumissions-efficaces-mma";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"2026-03-30-muay-thai-8-techniques-essentielles-pour-debutants.md": {
	id: "2026-03-30-muay-thai-8-techniques-essentielles-pour-debutants.md";
  slug: "2026-03-30-muay-thai-8-techniques-essentielles-pour-debutants";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"2026-04-01-muay-thai-pour-debutants-maitriser-les-bases-des-poings-pieds-coudes-g.md": {
	id: "2026-04-01-muay-thai-pour-debutants-maitriser-les-bases-des-poings-pieds-coudes-g.md";
  slug: "2026-04-01-muay-thai-pour-debutants-maitriser-les-bases-des-poings-pieds-coudes-g";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"2026-04-03-kickboxing-pour-debutants-le-guide-complet-des-bases.md": {
	id: "2026-04-03-kickboxing-pour-debutants-le-guide-complet-des-bases.md";
  slug: "2026-04-03-kickboxing-pour-debutants-le-guide-complet-des-bases";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"2026-04-09-grappling-bjj-8-bases-essentielles-pour-debutants.md": {
	id: "2026-04-09-grappling-bjj-8-bases-essentielles-pour-debutants.md";
  slug: "2026-04-09-grappling-bjj-8-bases-essentielles-pour-debutants";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"2026-04-09-histoire-du-kickboxing-voyage-explosif-du-japon-a-leurope.md": {
	id: "2026-04-09-histoire-du-kickboxing-voyage-explosif-du-japon-a-leurope.md";
  slug: "2026-04-09-histoire-du-kickboxing-voyage-explosif-du-japon-a-leurope";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"2026-04-10-k1-kickboxing-regles-histoire-et-origines.md": {
	id: "2026-04-10-k1-kickboxing-regles-histoire-et-origines.md";
  slug: "2026-04-10-k1-kickboxing-regles-histoire-et-origines";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"2026-04-10-k1-low-kick-technique-et-entrainement.md": {
	id: "2026-04-10-k1-low-kick-technique-et-entrainement.md";
  slug: "2026-04-10-k1-low-kick-technique-et-entrainement";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"2026-04-10-karate-debuter-guide-complet.md": {
	id: "2026-04-10-karate-debuter-guide-complet.md";
  slug: "2026-04-10-karate-debuter-guide-complet";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"2026-04-10-karate-shotokan-techniques-fondamentales.md": {
	id: "2026-04-10-karate-shotokan-techniques-fondamentales.md";
  slug: "2026-04-10-karate-shotokan-techniques-fondamentales";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"2026-04-10-savate-technique-coups-de-pied.md": {
	id: "2026-04-10-savate-technique-coups-de-pied.md";
  slug: "2026-04-10-savate-technique-coups-de-pied";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"alimentation-sportif-arts-martiaux.md": {
	id: "alimentation-sportif-arts-martiaux.md";
  slug: "alimentation-sportif-arts-martiaux";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"boxe-8-coups-fondamentaux.md": {
	id: "boxe-8-coups-fondamentaux.md";
  slug: "boxe-8-coups-fondamentaux";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"boxe-garde-fondamentale.md": {
	id: "boxe-garde-fondamentale.md";
  slug: "boxe-garde-fondamentale";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"boxe-jab-technique.md": {
	id: "boxe-jab-technique.md";
  slug: "boxe-jab-technique";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"boxe-vs-kickboxing.md": {
	id: "boxe-vs-kickboxing.md";
  slug: "boxe-vs-kickboxing";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"comment-lire-combat-boxe.md": {
	id: "comment-lire-combat-boxe.md";
  slug: "comment-lire-combat-boxe";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"debuter-sports-de-combat-apres-30-ans.md": {
	id: "debuter-sports-de-combat-apres-30-ans.md";
  slug: "debuter-sports-de-combat-apres-30-ans";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"grappling-disciplines-gi-nogi-luta-livre.md": {
	id: "grappling-disciplines-gi-nogi-luta-livre.md";
  slug: "grappling-disciplines-gi-nogi-luta-livre";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"grappling-vs-mma-frappes.md": {
	id: "grappling-vs-mma-frappes.md";
  slug: "grappling-vs-mma-frappes";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"guide-debuter-bjj-grappling.md": {
	id: "guide-debuter-bjj-grappling.md";
  slug: "guide-debuter-bjj-grappling";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"guide-debuter-boxe.md": {
	id: "guide-debuter-boxe.md";
  slug: "guide-debuter-boxe";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"guide-debuter-kickboxing.md": {
	id: "guide-debuter-kickboxing.md";
  slug: "guide-debuter-kickboxing";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"guide-debuter-mma.md": {
	id: "guide-debuter-mma.md";
  slug: "guide-debuter-mma";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"guide-debuter-muay-thai.md": {
	id: "guide-debuter-muay-thai.md";
  slug: "guide-debuter-muay-thai";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"guide-equipement-bjj-grappling.md": {
	id: "guide-equipement-bjj-grappling.md";
  slug: "guide-equipement-bjj-grappling";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"guide-equipement-boxe.md": {
	id: "guide-equipement-boxe.md";
  slug: "guide-equipement-boxe";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"guide-equipement-kickboxing.md": {
	id: "guide-equipement-kickboxing.md";
  slug: "guide-equipement-kickboxing";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"guide-equipement-mma.md": {
	id: "guide-equipement-mma.md";
  slug: "guide-equipement-mma";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"guide-equipement-muay-thai.md": {
	id: "guide-equipement-muay-thai.md";
  slug: "guide-equipement-muay-thai";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"guide-sac-de-frappe-choisir.md": {
	id: "guide-sac-de-frappe-choisir.md";
  slug: "guide-sac-de-frappe-choisir";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"huit-armes-muay-thai.md": {
	id: "huit-armes-muay-thai.md";
  slug: "huit-armes-muay-thai";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"judo-bases-chutes-projections.md": {
	id: "judo-bases-chutes-projections.md";
  slug: "judo-bases-chutes-projections";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"karate-kyokushin-sport-contact-complet.md": {
	id: "karate-kyokushin-sport-contact-complet.md";
  slug: "karate-kyokushin-sport-contact-complet";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"kickboxing-vs-muay-thai.md": {
	id: "kickboxing-vs-muay-thai.md";
  slug: "kickboxing-vs-muay-thai";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"lethwei-boxe-birmane-art-martial-oublie.md": {
	id: "lethwei-boxe-birmane-art-martial-oublie.md";
  slug: "lethwei-boxe-birmane-art-martial-oublie";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"lethwei-guide-debutant.md": {
	id: "lethwei-guide-debutant.md";
  slug: "lethwei-guide-debutant";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"lethwei-vs-muay-thai-differences.md": {
	id: "lethwei-vs-muay-thai-differences.md";
  slug: "lethwei-vs-muay-thai-differences";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"low-kick-muay-thai-technique-puissance.md": {
	id: "low-kick-muay-thai-technique-puissance.md";
  slug: "low-kick-muay-thai-technique-puissance";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"mental-competition-gerer-stress.md": {
	id: "mental-competition-gerer-stress.md";
  slug: "mental-competition-gerer-stress";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"mma-preparation-physique-programme.md": {
	id: "mma-preparation-physique-programme.md";
  slug: "mma-preparation-physique-programme";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"mma-vs-boxe-differences.md": {
	id: "mma-vs-boxe-differences.md";
  slug: "mma-vs-boxe-differences";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"muay-thai-histoire-culture-mondiale.md": {
	id: "muay-thai-histoire-culture-mondiale.md";
  slug: "muay-thai-histoire-culture-mondiale";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"muay-thai-roundhouse-kick.md": {
	id: "muay-thai-roundhouse-kick.md";
  slug: "muay-thai-roundhouse-kick";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"muay-thai-vs-mma.md": {
	id: "muay-thai-vs-mma.md";
  slug: "muay-thai-vs-mma";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"preparation-premier-combat-boxe-amateur.md": {
	id: "preparation-premier-combat-boxe-amateur.md";
  slug: "preparation-premier-combat-boxe-amateur";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"regles-bjj-competition.md": {
	id: "regles-bjj-competition.md";
  slug: "regles-bjj-competition";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"regles-boxe-anglaise.md": {
	id: "regles-boxe-anglaise.md";
  slug: "regles-boxe-anglaise";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"regles-kickboxing.md": {
	id: "regles-kickboxing.md";
  slug: "regles-kickboxing";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"regles-mma-expliquees.md": {
	id: "regles-mma-expliquees.md";
  slug: "regles-mma-expliquees";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"regles-muay-thai.md": {
	id: "regles-muay-thai.md";
  slug: "regles-muay-thai";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"sambo-guide-debutant.md": {
	id: "sambo-guide-debutant.md";
  slug: "sambo-guide-debutant";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"sambo-sport-combat-russe-complet.md": {
	id: "sambo-sport-combat-russe-complet.md";
  slug: "sambo-sport-combat-russe-complet";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"sanda-guide-debutant.md": {
	id: "sanda-guide-debutant.md";
  slug: "sanda-guide-debutant";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"sanda-wushu-combat-sport-chinois.md": {
	id: "sanda-wushu-combat-sport-chinois.md";
  slug: "sanda-wushu-combat-sport-chinois";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"savate-boxe-francaise-histoire.md": {
	id: "savate-boxe-francaise-histoire.md";
  slug: "savate-boxe-francaise-histoire";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"savate-guide-debutant.md": {
	id: "savate-guide-debutant.md";
  slug: "savate-guide-debutant";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"styles-kickboxing-mondial.md": {
	id: "styles-kickboxing-mondial.md";
  slug: "styles-kickboxing-mondial";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"teep-muay-thai-guide-technique.md": {
	id: "teep-muay-thai-guide-technique.md";
  slug: "teep-muay-thai-guide-technique";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"wrestling-base-mma-moderne.md": {
	id: "wrestling-base-mma-moderne.md";
  slug: "wrestling-base-mma-moderne";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
};

	};

	type DataEntryMap = {
		
	};

	type AnyEntryMap = ContentEntryMap & DataEntryMap;

	export type ContentConfig = typeof import("./../../src/content/config.js");
}
