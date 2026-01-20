import {
	Card,
	Component,
	T,
	attribute,
	component,
	css,
	media,
	get,
	tsx,
	surface,
} from '@cxl/ui';

import { DocPill } from './chip.js';

export class DocCard extends Component {
	name?: string;

	kind?: string;
}

component(DocCard, {
	tagName: 'doc-card',
	init: [attribute('kind'), attribute('name')],
	augment: [
		css(`
:host{
	display:block;
	margin: 24px 0;
	scroll-margin-top: 80px;
}
:host(:target) {
	outline: 2px dashed var(--cxl-color-primary);
}
c-accordion-panel{ border: 0; }
#header { 
	padding: 12px 16px;
	display: flex;
	align-items: center;
	gap: 8px;
	border-bottom: 1px solid var(--cxl-color-outline-variant);
	${surface('surface-container-high')}	
}
#body { padding: 16px; }
#title { margin-inline-end: auto; }
${media('medium', ':host{}')}
		`),
		$ => {
			$.shadowRoot?.append(
				tsx(
					Card,
					{ color: 'surface', variant: 'outlined' },
					tsx(
						'div',
						{ id: 'header' },
						tsx(DocPill, { kind: get($, 'kind') }, get($, 'kind')),
						tsx(
							T,
							{ id: 'title', font: 'title-medium' },
							get($, 'name'),
						),
						tsx('slot', { name: 'tags' }),
					),
					tsx('div', { id: 'body' }, tsx('slot')),
				),
			);

			/*const srclink = $.getAttribute('src');
			const see =
				srclink && docgen.repository
					? ((
							<a
								title="See Source"
								target="_blank"
								href={`${docgen.repository}/${srclink}`}
							>
								{'</>'}
							</a>
					  ) as HTMLElement)
					: undefined;
			if (see) {
				see.style.float = 'right';
				see.style.textDecoration = 'none';
			}*/
		},
	],
});
