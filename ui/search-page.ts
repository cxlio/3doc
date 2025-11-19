import {
	component,
	Component,
	C,
	CardItem,
	FieldBar,
	Icon,
	InputText,
	R,
	css,
	get,
	font,
	onAction,
	media,
	GridList,
	renderEach,
	tsx,
	of,
} from '@cxl/ui';
import { Kind } from './docgen.js';

class DocSearchPage extends Component {}

component(DocSearchPage, {
	tagName: 'doc-search-page',
	augment: [
		css(`
:host { display: block; margin: 64px 0 }
#searchbar { margin: 0 auto 32px auto; max-width: 600px; min-width: min(480px, 100%); }
#grid { grid-template-columns: 1fr; row-gap: 8px; }
c-card-item { display: flex; gap: 16px; align-items:center; }
.title { ${font('body-medium')}}

${media(
	'small',
	`
	#grid { grid-template-columns: 1fr 1fr; gap: 16px; padding: 0 8px; }
`,
)}
${media(
	'medium',
	`
	#grid { grid-template-columns: 1fr 1fr 1fr; gap: 16px; padding: 0 8px; }
`,
)}
		`),
		() => {
			const groups: string[] = ['components'];
			const list = tsx(
				GridList,
				{ id: 'grid' },
				renderEach({
					source: of(groups),
					render: groupName =>
						tsx(
							R,
							undefined,
							tsx(
								C,
								{ className: 'title', xs: 1, sm: 2, md: 3 },
								groupName.value.toUpperCase(),
							),
							renderEach({
								source: of(CONFIG.symbols).map(data =>
									data.filter(
										c =>
											c.kind === Kind.Component &&
											c.tagName,
									),
								),
								render: item =>
									tsx(
										CardItem,
										{
											$: card =>
												onAction(card).tap(() => {
													if (
														!CONFIG.spa &&
														item.value?.href
													)
														location.href =
															item.value.href;
												}),
											pad: 16,
										},
										tsx(Icon, { name: item.value.icon }),
										' ',
										item.map(i => i.name),
									),
							}),
						),
				}),
			);

			const search = (el: InputText) =>
				get(el, 'value').raf(val => {
					val = val.toLowerCase();
					for (const group of list.children) {
						for (const item of group.children) {
							(item as HTMLElement).style.display =
								!val ||
								item.textContent?.toLowerCase().includes(val)
									? ''
									: 'none';
						}
					}
				});

			return tsx(
				'div',
				undefined,
				tsx(
					FieldBar,
					{ id: 'searchbar' },
					tsx(Icon, { name: 'search' }),
					tsx(InputText, { $: search }),
				),
				list,
			);
		},
	],
});
