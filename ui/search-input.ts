import {
	FieldBar,
	AutocompleteDynamic,
	C,
	Option,
	Icon,
	InputOption,
	component,
	be,
	on,
	get,
	tsx,
	renderEach,
	router,
	getSearchRegex,
} from '@cxl/ui';

import type { Symbol } from './root.js';

export class DocSearchInput extends FieldBar {}

component(DocSearchInput, {
	tagName: 'doc-search-input',
	augment: [
		$ => {
			const results = be<Symbol[]>([]);

			const card = tsx(
				AutocompleteDynamic,
				{
					$: el =>
						on(el, 'search').tap(ev => {
							const term = ev.detail;
							const result: Symbol[] = [];
							let max = 1000;
							if (term) {
								const regex = getSearchRegex(term);
								for (const s of CONFIG.symbols) {
									if (regex.test(s.name)) result.push(s);
									if (max-- < 0) break;
								}
							}

							results.next(result);
						}),
				},
				renderEach({
					source: results,
					render: r =>
						tsx(
							Option,
							{
								value: r.map(v => v.href),
							},
							r.map(v => v.name),
						),
					empty: () =>
						tsx(C, { slot: 'empty', pad: 16 }, 'No Results Found'),
				}),
			);
			card.style.maxHeight = '50%';

			$.size = -2;

			$.append(
				tsx(Icon, { name: 'search' }),
				tsx(InputOption, {
					$: el =>
						get(el, 'selected').tap(sel => {
							const url = sel?.value as string;
							if (!url) return;

							if (CONFIG.spa) router.go(url);
							else location.href = url;

							el.value = '';
						}),
				}),
				card,
			);
		},
	],
});
