import {
	AppbarContextual,
	IconButton,
	Toggle,
	component,
	Component,
	breakpoint,
	css,
	tsx,
} from '@cxl/ui';

import { DocSearchInput } from './search-input.js';

export class DocSearch extends Component {}

component(DocSearch, {
	tagName: 'doc-search',
	augment: [
		css(`
:host { display: block; }
c-appbar-contextual {
	position: absolute;
	inset: 0;
	background-color: var(--cxl-color-surface);
	color: var(--cxl-color-on-surface);
	z-index: 1;
}
		`),
		$ => {
			const contextual = tsx(AppbarContextual);
			const iconButton = tsx(
				Toggle,
				{ target: contextual },
				tsx(IconButton, { icon: 'search' }),
			);
			const search = tsx(DocSearchInput);

			$.shadowRoot?.append(contextual, iconButton);

			return breakpoint(document.body).tap(bp => {
				if (bp === 'xsmall') {
					contextual.style.display = '';
					iconButton.style.display = '';
					contextual.append(search);
				} else {
					contextual.open = false;
					contextual.style.display = 'none';
					iconButton.style.display = 'none';
					if (search.parentNode !== $.shadowRoot)
						$.shadowRoot?.append(search);
				}
			});
		},
	],
});
