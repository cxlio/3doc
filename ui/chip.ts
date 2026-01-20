import {
	Chip,
	Pill,
	Size,
	component,
	css,
	font,
	styleAttribute,
} from '@cxl/ui';

export const ChipColors = [
	'Property',
	'Method',
	'Function',
	'Event',
	'Class',
	'Namespace',
	'Interface',
	'Enum',
	'TypeAlias',
	'Attribute',
	'Component',
	'Constant',
] as const;

const colorCss = ChipColors.map(
	kind =>
		`:host([kind=${kind}]){--cxl-color-surface:var(--3doc-chip-${kind}-bg);--cxl-color-on-surface:var(--3doc-chip-${kind}-fg)}`,
).join('');

export class DocPill extends Pill {
	kind?: string;

	size: Size = -1;
}
component(DocPill, {
	tagName: 'doc-pill',
	init: [styleAttribute('kind')],
	augment: [
		css(`
:host { ${font('code')}; border: 0; }
${colorCss}`),
	],
});

export class DocChip extends Chip {
	kind?: string;

	size: Size = -1;
}

component(DocChip, {
	tagName: 'doc-chip',
	init: [styleAttribute('kind')],
	augment: [
		css(`
:host { ${font('code')} }
${colorCss}`),
	],
});
