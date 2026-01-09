import { Chip, Size, component, css, font, styleAttribute } from '@cxl/ui';

export const ChipColors = {
	Property: ['rgb(227, 247, 252)', 'rgb(18, 152, 186)'], // cyan
	Method: ['rgb(231, 249, 237)', 'rgb(36, 143, 71)'], // green
	Function: ['rgb(231, 249, 237)', 'rgb(36, 143, 71)'], // green
	Event: ['rgb(247, 242, 255)', 'rgb(117, 55, 199)'], // purple
	Class: ['rgb(255, 244, 229)', 'rgb(184, 90, 0)'], // orange
	Namespace: ['rgb(238, 242, 255)', 'rgb(67, 56, 202)'], // indigo
	Interface: ['rgb(255, 241, 242)', 'rgb(190, 18, 60)'], // rose
	Enum: ['rgb(240, 253, 250)', 'rgb(13, 148, 136)'], // teal
	TypeAlias: ['rgb(254, 249, 195)', 'rgb(161, 98, 7)'], // yellow/amber
	Attribute: ['rgb(240, 249, 255)', 'rgb(3, 105, 161)'], // sky/blue
	Component: ['rgb(243, 232, 255)', 'rgb(126, 34, 206)'], // violet
};

export class DocChip extends Chip {
	kind?: string;

	member = false;

	size: Size = -1;
}
component(DocChip, {
	tagName: 'doc-chip',
	init: [styleAttribute('kind'), styleAttribute('member')],
	augment: [
		css(`
:host { ${font('code')} }
:host(:not([member])) { border: 0 }
${Object.entries(ChipColors)
	.map(
		([kind, colors]) =>
			`:host([kind=${kind}]){--cxl-color-surface:${colors[0]};--cxl-color-on-surface:${colors[1]};}`,
	)
	.join('')}
`),
	],
});
