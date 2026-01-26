import {
	Component,
	component,
	css,
	getShadow,
	observeChildren,
	onVisible,
	attribute,
	surface,
	tsx,
} from '@cxl/ui';

declare global {
	var hljs: typeof import('highlight.js').default;
}

export class DocCode extends Component {
	language = 'html';

	formatter?: (src: string) => string = (source: string) => {
		let code;
		try {
			code = hljs.highlight(source, { language: this.language }).value;
		} catch (e) {
			code = source;
		}

		return `<code>${code}</code>`;
	};
}

component(DocCode, {
	tagName: 'doc-hl',
	init: [attribute('language')],
	augment: [
		css(`
:host {
	display: block;
	padding:16px; border-radius: 8px;
	${surface('surface-container')}
}
.hljs {
	white-space: pre-wrap; font: var(--cxl-font-code);
}
.hljs-comment,
.hljs-quote {
	color: var(--hljs-comment);
	font-style: italic;
}
.hljs-operator,
.hljs-punctuation,
.hljs-subst,
.hljs-name,
.hljs-section,
.hljs-selector-tag,
.hljs-selector-class,
.hljs-selector-attr,
.hljs-selector-pseudo,
.hljs-selector-id,
.hljs-variable,
.hljs-template-variable {
	color: var(--hljs-structure);
}
.hljs-attribute,
.hljs-attr,
.hljs-meta-string {
	color: var(--hljs-attr);
}
.hljs-keyword,
.hljs-literal,
.hljs-built_in,
.hljs-doctag,
.hljs-formula {
	color: var(--hljs-keyword);
}
.hljs-function .hljs-title,
.hljs-title.function_ {
	color: var(--hljs-fn-title);
}
.hljs-function,
.hljs-params {
	color: var(--hljs-structure);
}
.hljs-type,
.hljs-class .hljs-title,
.hljs-title.class_ {
	color: var(--hljs-type);
}
.hljs-interface .hljs-title {
	color: var(--hljs-interface-title);
}
.hljs-string,
.hljs-regexp {
	color: var(--hljs-string);
	opacity: 0.85;
}
.dark .hljs-string,
.dark .hljs-regexp {
	opacity: 0.88;
}
.hljs-number {
	color: var(--hljs-number);
}
.hljs-meta,
.hljs-tag {
	color: var(--hljs-meta);
}
.hljs-tag .hljs-name {
	color: var(--hljs-attr);
}
.hljs-emphasis {
	font-style: italic;
}
.hljs-strong {
	font-weight: 700;
}
.hljs-link {
	text-decoration: underline;
}

	`),
		host => {
			const srcContainer = tsx('div', { className: 'hljs' });
			srcContainer.style.tabSize = '4';
			getShadow(host).append(srcContainer);
			return onVisible(host).switchMap(() =>
				observeChildren(host).raf(() => {
					const src = Array.from(host.childNodes)
						.map(r => r.textContent)
						.join('');
					srcContainer.innerHTML =
						src && host.formatter ? host.formatter(src) : src;
				}),
			);
		},
	],
});
