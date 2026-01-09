import {
	FieldBar,
	Autocomplete,
	C,
	Option,
	Icon,
	InputOption,
	component,
	be,
	get,
	tsx,
	onLoad,
	renderEach,
} from '@cxl/ui';

import type { Symbol } from './root.js';

export class DocSearchInput extends FieldBar {}

component(DocSearchInput, {
	tagName: 'doc-search-input',
	augment: [
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

			$.size = -2;

			function buildSearch() {
				results.next(CONFIG.symbols);
			}

			$.append(
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

			return onLoad().tap(buildSearch);
		},
	],
});
