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
	theme,
	tsx,
} from '@cxl/ui';

import { DocAppbar } from './appbar.js';
import { DocSearchInput } from './search-input.js';

theme.globalCss += `
doc-ct { gap:8px;margin-bottom:24px;white-space:wrap;font:var(--cxl-font-code);font-size:18px;display:flex;align-items:center; }
doc-card dl { display: flex; flex-direction: column; }
doc-card dt { border-inline-start: 2px solid var(--cxl-color-outline-variant); padding-inline-start: 16px; }
doc-card dd { border-inline-start: 2px solid var(--cxl-color-outline-variant); margin-inline-start: 0; padding-inline-start: 16px; margin-bottom:16px; }
:last-child{margin-bottom:0}
code{border-radius:4px;background-color:var(--cxl-color-surface-container);color:var(--cxl-color-on-surface);padding:2px 4px;${font('code')}}
`;

export class DocApp extends Component {}

component(DocApp, {
	tagName: 'doc-app',
	augment: [
		css(`
:host {
	display:contents;
	--hljs-comment: rgba(51, 65, 85, 0.55);
	--hljs-structure: rgba(15, 23, 42, 0.78);
	--hljs-attr: rgb(18, 152, 186);
	--hljs-keyword: rgb(184, 90, 0);
	--hljs-fn-title: rgb(36, 143, 71);
	--hljs-type: rgb(67, 56, 202);
	--hljs-interface-title: rgb(190, 18, 60);
	--hljs-string: rgb(184, 90, 0);
	--hljs-number: rgba(15, 23, 42, 0.86);
	--hljs-meta: rgba(15, 23, 42, 0.65);
	  --3doc-chip-Property-bg: rgb(227, 247, 252);
  --3doc-chip-Property-fg: rgb(18, 152, 186);

  --3doc-chip-Method-bg: rgb(231, 249, 237);
  --3doc-chip-Method-fg: rgb(36, 143, 71);

  --3doc-chip-Function-bg: rgb(231, 249, 237);
  --3doc-chip-Function-fg: rgb(36, 143, 71);

  --3doc-chip-Event-bg: rgb(247, 242, 255);
  --3doc-chip-Event-fg: rgb(117, 55, 199);

  --3doc-chip-Class-bg: rgb(255, 244, 229);
  --3doc-chip-Class-fg: rgb(184, 90, 0);

  --3doc-chip-Namespace-bg: rgb(238, 242, 255);
  --3doc-chip-Namespace-fg: rgb(67, 56, 202);

  --3doc-chip-Interface-bg: rgb(255, 241, 242);
  --3doc-chip-Interface-fg: rgb(190, 18, 60);

  --3doc-chip-Enum-bg: rgb(240, 253, 250);
  --3doc-chip-Enum-fg: rgb(13, 148, 136);

  --3doc-chip-TypeAlias-bg: rgb(254, 249, 195);
  --3doc-chip-TypeAlias-fg: rgb(161, 98, 7);

  --3doc-chip-Attribute-bg: rgb(240, 249, 255);
  --3doc-chip-Attribute-fg: rgb(3, 105, 161);

  --3doc-chip-Component-bg: rgb(243, 232, 255);
  --3doc-chip-Component-fg: rgb(126, 34, 206);
    --3doc-chip-Constant-bg: rgb(241, 245, 249);
  --3doc-chip-Constant-fg: rgb(51, 65, 85);
}
c-application[theme=dark] {
	--hljs-comment: rgba(148, 163, 184, 0.58);
	--hljs-structure: rgba(226, 232, 240, 0.82);
	--hljs-attr: rgb(56, 189, 248);
	--hljs-keyword: rgb(251, 146, 60);
	--hljs-fn-title: rgb(74, 222, 128);
	--hljs-type: rgb(129, 140, 248);
	--hljs-interface-title: rgb(251, 113, 133);
	--hljs-string: rgb(251, 146, 60);
	--hljs-number: rgba(226, 232, 240, 0.88);
	--hljs-meta: rgba(226, 232, 240, 0.62);
	--3doc-chip-Property-bg: rgb(8, 47, 73);
  --3doc-chip-Property-fg: rgb(103, 232, 249);

  --3doc-chip-Method-bg: rgb(20, 83, 45);
  --3doc-chip-Method-fg: rgb(134, 239, 172);

  --3doc-chip-Function-bg: rgb(20, 83, 45);
  --3doc-chip-Function-fg: rgb(134, 239, 172);

  --3doc-chip-Event-bg: rgb(59, 7, 100);
  --3doc-chip-Event-fg: rgb(216, 180, 254);

  --3doc-chip-Class-bg: rgb(124, 45, 18);
  --3doc-chip-Class-fg: rgb(253, 186, 116);

  --3doc-chip-Namespace-bg: rgb(30, 27, 75);
  --3doc-chip-Namespace-fg: rgb(165, 180, 252);

  --3doc-chip-Interface-bg: rgb(76, 5, 25);
  --3doc-chip-Interface-fg: rgb(253, 164, 175);

  --3doc-chip-Enum-bg: rgb(19, 78, 74);
  --3doc-chip-Enum-fg: rgb(94, 234, 212);

  --3doc-chip-TypeAlias-bg: rgb(120, 53, 15);
  --3doc-chip-TypeAlias-fg: rgb(253, 230, 138);

  --3doc-chip-Attribute-bg: rgb(12, 74, 110);
  --3doc-chip-Attribute-fg: rgb(125, 211, 252);

  --3doc-chip-Component-bg: rgb(76, 29, 149);
  --3doc-chip-Component-fg: rgb(221, 214, 254);
    --3doc-chip-Constant-bg: rgb(30, 41, 59);
  --3doc-chip-Constant-fg: rgb(226, 232, 240);
}
#body{overflow:hidden; flex-grow: 1;}
#page { padding: 16px; flex-grow: 1; ${font('body-large')}; overflow-y: auto; }
#pagebody { margin: 0 auto; max-width:1200px; }
#navbar[responsiveon] {
	overflow:hidden; width:320px;
	box-sizing: border-box;
	flex-grow: 1;
}
::slotted([slot=navbar]) { padding: 8px; }
c-application { opacity: 0; }
c-application[ready] { opacity: 1; }
#version{margin-left:auto;}
#navbar-container {
	max-width:320px;
	width: 0;
	visibility: hidden;
	${surface('surface-container-low')}}
${media(
	'large',
	`
#navbar-container { width: auto; visibility: visible; }
#page { padding: 48px 32px; }
`,
)}
		`),
		$ => {
			$.style.opacity = '1';
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
							tsx(Flex, { grow: true }),
							tsx(IconToggleTheme, { persistkey: '3doc.theme' }),
						),
					),
					tsx(
						'div',
						{ id: 'page' },
						tsx(
							'div',
							{ id: 'pagebody' },
							tsx('slot'),
							//tsx(RouterOutlet),
						),
					),
				),
			);

			$.shadowRoot?.append(app);
			$.append(new RouterOutlet());
		},
	],
});
