import {
	Component,
	component,
	css,
	getShadow,
	observeChildren,
	attribute,
	tsx,
} from '@cxl/ui';

declare global {
	var hljs: typeof import('highlight.js').default;
}

export class BlogCode extends Component {
	language = 'html';

	formatter?: (src: string) => string = (source: string) => {
		return (
			`<link rel="stylesheet" href="hljs.css" /><code>` +
			hljs.highlight(source, { language: this.language }).value +
			'</code>'
		);
	};
}

component(BlogCode, {
	tagName: 'doc-hl',
	init: [attribute('language')],
	augment: [
		css(`
:host { display: block;  }
.hljs { white-space: pre-wrap; font: var(--cxl-font-code); padding:16px; border-radius: 8px; border: 1px solid var(--cxl-color-outline-variant); }
	`),
		host => {
			const srcContainer = tsx('div', { className: 'hljs' });
			srcContainer.style.tabSize = '4';
			getShadow(host).append(srcContainer);
			return observeChildren(host).raf(() => {
				let src = host.childNodes[0]?.textContent?.trim() || '';
				if (src && host.formatter) src = host.formatter(src);
				srcContainer.innerHTML = src;
			});
		},
	],
});
