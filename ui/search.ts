import {
	FieldBar,
	Autocomplete,
	C,
	Option,
	Icon,
	InputOption,
	component,
	Component,
	be,
	css,
	get,
	tsx,
	onLoad,
	renderEach,
} from '@cxl/ui';

import type { Symbol } from './root.js';

export class DocSearch extends Component {}

component(DocSearch, {
	tagName: 'doc-search',
	augment: [
		css(``),
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

			$.shadowRoot?.append(search);

			return onLoad().tap(buildSearch);
		},
	],
});
