import { Component, component, property, onUpdate } from '@cxl/ui';
import { docgenRender } from './docgen-render.js';

import type { SummaryJson } from './docgen.js';

export class Page extends Component {
	name?: string;

	summary?: SummaryJson;

	uicdn?: string;

	importmap = '';
}
component(Page, {
	tagName: 'doc-page',
	init: [property('name'), property('summary'), property('uicdn')],
	augment: [
		$ =>
			onUpdate($).raf(() => {
				$.replaceChildren();
				if (!$.name || !$.summary) return;
				const route = $.name;
				const docs = $.summary.index.find(s => s.name === route);
				if (!docs) return;
				$.append(
					docgenRender({
						summary: docs,
						summaryJson: $.summary,
						uiCdn: $.uicdn ?? '',
						importmap: $.importmap,
					}),
				);
			}),
	],
});
