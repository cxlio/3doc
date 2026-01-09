import {
	Appbar,
	NavbarToggle,
	Flex,
	component,
	css,
	media,
	tsx,
} from '@cxl/ui';

import { DocSearch } from './search.js';

export class DocAppbar extends Appbar {
	sticky = true;
}

component(DocAppbar, {
	tagName: 'doc-appbar',
	augment: [
		css(media('large', `:host{display:none}`)),
		$ => {
			$.append(
				tsx(NavbarToggle, { target: 'navbar' }),
				tsx(Flex, { grow: true }, CONFIG.packageName),
				tsx(DocSearch),
			);
		},
	],
});
