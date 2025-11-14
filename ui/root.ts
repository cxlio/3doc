import { Application, component, get, ref, tsx } from '@cxl/ui';

import { NavList } from './nav-list.js';
import { Page } from './page.js';

import type { SummaryJson } from './docgen.js';

export { Body, Drawer, Icon } from '@cxl/ui';

declare global {
	const CONFIG: {
		packageName: string;
	};
}

export class ComponentList extends Application {
	summary?: SummaryJson;

	sheetstart = true;
}

component(ComponentList, {
	tagName: 'doc-root',
	augment: [
		$ => {
			const summary = ref<SummaryJson>();
			fetch('summary.json')
				.then<SummaryJson>(r => r.json())
				.then(s => summary.next(s));

			const nav = tsx(NavList, { slot: 'start', summary });

			$.append(nav, tsx(Page, { summary, name: get(nav, 'selected') }));
		},
	],
});
