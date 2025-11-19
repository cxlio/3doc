import {
	FieldBar,
	Autocomplete,
	AppbarContextual,
	C,
	Option,
	Icon,
	IconButton,
	InputOption,
	Toggle,
	component,
	Component,
	be,
	breakpoint,
	css,
	get,
	tsx,
	onLoad,
	renderEach,
	merge,
} from '@cxl/ui';

import type { Symbol } from './root.js';

export class DocSearch extends Component {}

component(DocSearch, {
	tagName: 'doc-search',
	augment: [
		css(`
:host { display: contents; }
c-appbar-contextual {
	position: absolute;
	inset: 0;
	background-color: var(--cxl-color-surface);
	color: var(--cxl-color-on-surface);
	z-index: 1;
}
		`),
		$ => {
			const results = be<Symbol[]>([]);

			const card = tsx(
				Autocomplete,
				{},
				renderEach({
					source: results,
					render: r =>
						tsx(
							Option,
							{
								value: r.value.href,
							},
							r.value.name,
						),
					empty: () =>
						tsx(C, { slot: 'empty', pad: 16 }, 'No Results Found'),
				}),
			);
			card.style.maxHeight = '50%';
			const contextual = tsx(AppbarContextual);
			const iconButton = tsx(
				Toggle,
				{ target: contextual },
				tsx(IconButton, { icon: 'search' }),
			);
			const search = tsx(
				FieldBar,
				{ size: -2 },
				tsx(Icon, { name: 'search' }),
				tsx(InputOption, {
					$: el =>
						get(el, 'selected').tap(sel => {
							if (!CONFIG.spa && sel?.value)
								location.href = sel.value as string;
						}),
				}),
				card,
			);

			function buildSearch() {
				results.next(CONFIG.symbols);
			}

			$.shadowRoot?.append(contextual, iconButton);

			return merge(
				onLoad().tap(buildSearch),
				breakpoint($.parentElement ?? $).tap(bp => {
					if (bp === 'xsmall') {
						contextual.style.display = '';
						iconButton.style.display = '';
						contextual.append(search);
					} else {
						contextual.open = false;
						contextual.style.display = 'none';
						iconButton.style.display = 'none';
						$.shadowRoot?.append(search);
					}
				}),
			);
		},
	],
});
