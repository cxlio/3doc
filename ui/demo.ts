import { component } from '@cxl/ui';
import { DocDemoBare } from './demo-bare.js';
import hljs from 'highlight.js/lib/core';

/**
 * Defines a demo component that displays interactive code examples within an iframe,
 * enables toggling between mobile, desktop, and source code views,
 * and allows copying code to clipboard. Provides live preview and formatted source views,
 * enhancing documentation and showcasing usage examples.
 *
 * @tagName doc-demo
 * @alpha
 */
export class DocDemo extends DocDemoBare {
	header =
		'<style>html{overflow:hidden;color: var(--cxl-color-on-background);background-color:var(--cxl-color-background)}</style>' +
		`${CONFIG.demoStyles ? `<style>${CONFIG.demoStyles}</style>` : ''}${
			CONFIG.demoScripts
				?.map(s => `<script type="module" src="${s}"></script>`)
				.join('') ?? ''
		}`;

	formatter?: (src: string) => string = (source: string) => {
		return (
			`<link rel="stylesheet" href="hljs.css" />` +
			hljs.highlight(source, { language: 'html' }).value
		);
	};
}

component(DocDemo, {
	tagName: 'doc-demo',
});
