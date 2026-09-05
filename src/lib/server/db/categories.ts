export const CATEGORIES = [
	{ id: 'music', slug: 'music', name: 'Music', sortOrder: 1 },
	{ id: 'languages', slug: 'languages', name: 'Languages', sortOrder: 2 },
	{ id: 'tech', slug: 'tech', name: 'Tech', sortOrder: 3 },
	{ id: 'cooking', slug: 'cooking', name: 'Cooking', sortOrder: 4 },
	{ id: 'crafts', slug: 'crafts', name: 'Crafts', sortOrder: 5 },
	{ id: 'fitness', slug: 'fitness', name: 'Fitness', sortOrder: 6 },
	{ id: 'home-repair', slug: 'home-repair', name: 'Home repair', sortOrder: 7 },
	{ id: 'academic', slug: 'academic', name: 'Academic', sortOrder: 8 },
	{ id: 'arts', slug: 'arts', name: 'Arts', sortOrder: 9 },
	{ id: 'other', slug: 'other', name: 'Other', sortOrder: 10 }
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
