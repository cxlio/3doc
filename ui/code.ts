import {
	Component,
	component,
	css,
	getShadow,
	onLoad,
	observeChildren,
	tsx,
} from '@cxl/ui';

export class BlogCode extends Component {
	formatter?: (src: string) => string;
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
