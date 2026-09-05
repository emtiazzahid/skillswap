import type { SkillInput } from './services/skills';

/** Parse the shared notice form into a SkillInput (validation happens in the service). */
export function parseSkillForm(form: FormData): SkillInput {
	const kind = String(form.get('kind') ?? 'offer') === 'want' ? 'want' : 'offer';
	const level = String(form.get('level') ?? 'beginner');
	const format = String(form.get('format') ?? 'either');
	return {
		kind,
		categoryId: String(form.get('categoryId') ?? ''),
		title: String(form.get('title') ?? ''),
		description: String(form.get('description') ?? ''),
		level: (['beginner', 'intermediate', 'advanced'].includes(level)
			? level
			: 'beginner') as SkillInput['level'],
		format: (['in_person', 'online', 'either'].includes(format)
			? format
			: 'either') as SkillInput['format'],
		availability: String(form.get('availability') ?? '')
	};
}
