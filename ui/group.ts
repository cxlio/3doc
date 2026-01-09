import {
	Card,
	Component,
	Flex,
	RouterLink,
	T,
	component,
	css,
	attribute,
	get,
	tsx,
} from '@cxl/ui';

import { DocChip } from './chip.js';

export class DocMembers extends Card {}
component(DocMembers, {
	tagName: 'doc-members',
	augment: [
		css(`
:host { display: flex; flex-direction: column; gap: 16px; margin: 32px 0; }
		`),
		$ => {
			$.variant = 'outlined';
			$.color = 'surface-container-low';
			$.pad = 16;
			$.shadowRoot?.prepend(tsx(T, { font: 'title-small' }, 'Members'));
		},
	],
});

export class DocMember extends Component {
	href?: string;
}
component(DocMember, {
	tagName: 'doc-member',
	init: [attribute('href')],
	augment: [
		css(`
		`),
		$ => {
			$.shadowRoot?.append(
				tsx(
					RouterLink,
					{ href: get($, 'href') },
					tsx(DocChip, { size: -1, member: true }, tsx('slot')),
				),
			);
		},
	],
});

export class DocGroup extends Component {
	kind?: string;
}
component(DocGroup, {
	tagName: 'doc-group',
	init: [attribute('kind')],
	augment: [
		css(`
:host { display: flex; flex-direction: column; gap: 8px; }
		`),
		$ => {
			$.shadowRoot?.append(
				tsx(
					Flex,
					{ gap: 16, middle: true },
					tsx(DocChip, { kind: get($, 'kind') }, get($, 'kind')),
					tsx(T, { font: 'title-small' }, ''),
				),
				tsx(Flex, { gap: 8, middle: true }, tsx('slot')),
			);
		},
	],
});
