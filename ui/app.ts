import {
	Component,
	Application,
	Drawer,
	IconToggleTheme,
	Flex,
	Hr,
	T,
	C,
	RouterOutlet,
	component,
	css,
	font,
	media,
	surface,
	tsx,
} from '@cxl/ui';

import { DocAppbar } from './appbar.js';
import { DocSearchInput } from './search-input.js';

export class DocApp extends Component {}

component(DocApp, {
	tagName: 'doc-app',
	augment: [
		css(`
:host{display:contents}
#body{overflow:hidden}
#page { padding: 16px; flex-grow: 1; ${font('body-large')}; overflow-y: auto; }
#navbar[responsiveon] {
	overflow:hidden; width:320px;
	padding: 8px; box-sizing: border-box;
}
#version{margin-left:auto;}
#navbar-container {
	max-width:320px;
	width: 0;
	visibility: hidden;
	${surface('surface-container-low')}}
${media(
	'large',
	`
	#navbar-container { width: auto; visibility: visible; } }
	#page { padding: 48px 32px; }
`,
)}
		`),
		$ => {
			const drawer = tsx(
				Drawer,
				{ id: 'navbar', responsive: 'large' },
				tsx('slot', { name: 'navbar' }),
			);
			const app = tsx(
				Application,
				undefined,
				tsx(DocAppbar),
				tsx(
					Flex,
					{ id: 'body' },
					tsx(
						Flex,
						{ vflex: true, id: 'navbar-container' },
						tsx(
							Flex,
							{ pad: 16, vpad: 24, middle: true },
							tsx(
								T,
								{ font: 'title-medium' },
								CONFIG.packageName,
							),
							tsx(
								T,
								{ id: 'version', font: 'title-small' },
								CONFIG.activeVersion,
							),
						),
						tsx(Hr),
						tsx(C, { pad: 16 }, tsx(DocSearchInput)),
						drawer,
						tsx(Hr),
						tsx(
							Flex,
							{ pad: 16 },
							tsx(IconToggleTheme, { persistkey: '3doc.theme' }),
						),
					),
					tsx('div', { id: 'page' }, tsx('slot'), tsx(RouterOutlet)),
				),
			);

			$.shadowRoot?.append(app);
		},
	],
});
