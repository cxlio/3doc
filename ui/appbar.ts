import {
	Appbar,
	NavbarToggle,
	IconToggleTheme,
	Flex,
	Toolbar,
	component,
	tsx,
} from '@cxl/ui';

import { DocSearch } from './search.js';

export class DocAppbar extends Appbar {
	sticky = true;
}

component(DocAppbar, {
	tagName: 'doc-appbar',
	augment: [
		$ => {
			$.append(
				tsx(
					Toolbar,
					{ id: 'appbar-toolbar' },
					tsx(NavbarToggle, { target: 'navbar' }),
					tsx(Flex, { grow: true }, CONFIG.packageName),
					tsx(DocSearch),
					tsx(IconToggleTheme, { persistkey: '3doc.theme' }),
				),
			);
		},
	],
});
