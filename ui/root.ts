import { Application, component, ref, tsx, theme } from '@cxl/ui';

//import { NavList } from './nav-list.js';
import { Page } from './page.js';

import type { SummaryJson } from './docgen.js';
import type { Kind } from '../dts/enum.js';

theme.colors['outline-variant'] = 'rgb(219, 221, 225)';

export {
	Body,
	Page as UiPage,
	Drawer,
	Icon,
	NavHeadline,
	NavDropdown,
	NavTarget,
	GridList,
	CardItem,
	Hr,
	R,
} from '@cxl/ui';

declare global {
	const CONFIG: {
		packageName: string;
		activeVersion: string;
		versions: string;
		repository?: string;
		spa: boolean;
		demoScripts?: string[];
		demoStyles?: string;
		symbols: Symbol[];
	};
}

export type Symbol = {
	name: string;
	tagName?: string;
	icon?: string;
	kind: Kind;
	href?: string;
};

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
				.then(s => summary.next(s))
				.catch(e => console.error(e));

			//const nav = tsx(NavList, { slot: 'start', summary });

			$.append(tsx(Page, { summary }));
		},
	],
});
