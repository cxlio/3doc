import { Component, Slot, component, css, media } from '@cxl/ui';

export class DocGrid extends Component {}

component(DocGrid, {
	tagName: 'doc-grd',
	augment: [
		css(`:host {
	padding: 8px 16px;
	display: grid;
	gap: 16px 12px;
}
${media('small', `:host{grid-template-columns:repeat(2, minmax(0px,1fr))}`)}
${media('medium', `:host{grid-template-columns:repeat(3, minmax(0px,1fr))}`)}
${media('large', `:host{grid-template-columns:repeat(4, minmax(0px,1fr))}`)}
`),
		Slot,
	],
});
