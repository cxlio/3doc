import {
	Component,
	Flex,
	T,
	Hr,
	component,
	css,
	attribute,
	get,
	tsx,
} from '@cxl/ui';
import { DocChip } from './chip.js';

export class PageHeader extends Component {
	module?: string;
	kind?: string;
	tags?: string;
}
component(PageHeader, {
	tagName: 'doc-page-header',
	init: [attribute('kind'), attribute('tags'), attribute('module')],
	augment: [
		css(`
:host { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
#title { margin-inline-end: auto; }
		`),
		$ => {
			$.shadowRoot?.append(
				tsx(T, { font: 'title-small' }, get($, 'module')),
				tsx(
					Flex,
					{ gap: 16, middle: true },
					tsx(DocChip, { kind: get($, 'kind') }, get($, 'kind')),
					tsx(
						T,
						{ font: 'headline-small', id: 'title' },
						tsx('slot'),
					),
					tsx('slot', { name: 'tags' }),
				),
				tsx(Hr),
			);
		},
	],
});
