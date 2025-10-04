import { Appbar, NavbarToggle, component, tsx } from '@cxl/ui';

export class DocAppbar extends Appbar {
	sticky = true;
}

component(DocAppbar, {
	tagName: 'doc-appbar',
	augment: [
		$ => {
			$.append(
				tsx(NavbarToggle, { target: 'navbar' }),
				CONFIG.packageName,
			);
		},
	],
});
