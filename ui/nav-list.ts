import {
	Component,
	Chip,
	NavItem,
	component,
	get,
	onAction,
	renderEach,
	property,
	tsx,
} from '@cxl/ui';

import type { SummaryJson } from './docgen.js';

export class NavList extends Component {
	summary?: SummaryJson;

	selected?: string;
}

component(NavList, {
	tagName: 'doc-nav-list',
	init: [property('summary'), property('selected')],
	augment: [
		$ => {
			return renderEach({
				source: get($, 'summary').map(s => s?.index),

				render: c =>
					tsx(
						NavItem,
						{
							$: el =>
								onAction(el).tap(
									() => ($.selected = c.value.name),
								),
							size: -2,
						},
						c.value.name,
						c.value.docs?.beta
							? tsx(Chip, { size: -2 }, 'beta')
							: undefined,
					),
			})($);
		},
	],
});
