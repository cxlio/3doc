import {
	Component,
	component,
	css,
	getShadow,
	onLoad,
	observeChildren,
	tsx,
} from '@cxl/ui';
import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';

hljs.registerLanguage('html', xml);

export class BlogCode extends Component {
	formatter?: (src: string) => string = (source: string) => {
		return (
			`<link rel="stylesheet" href="hljs.css" /><code style="white-space:pre;min-height:100%;font:var(--cxl-font-code);tab-size:2;">` +
			hljs.highlight(source, { language: 'html' }).value +
			'</code>'
		);
	};
}

component(BlogCode, {
	tagName: 'doc-hl',
	augment: [
		css(`
:host { display: block; }
.hljs { white-space: pre-wrap; font: var(--cxl-font-code); padding:16px; }
	`),
		host => {
			const srcContainer = tsx('div', { className: 'hljs' });
			srcContainer.style.tabSize = '4';
			getShadow(host).append(srcContainer);
			return onLoad().switchMap(() =>
				observeChildren(host).raf(() => {
					let src = host.childNodes[0]?.textContent?.trim() || '';
					if (src && host.formatter) src = host.formatter(src);
					srcContainer.innerHTML = src;
				}),
			);
		},
	],
});
