import {
	Component,
	Span,
	attribute,
	get,
	getShadow,
	component,
	tsx,
	css,
	observeChildren,
	onAction,
	onVisible,
	be,
	merge,
	Iframe,
	IconButton,
	Icon,
	ButtonText,
} from '@cxl/ui';

/**
 * Defines a demo component that displays interactive code examples within an iframe,
 * enables toggling between mobile, desktop, and source code views,
 * and allows copying code to clipboard. Provides live preview and formatted source views,
 * enhancing documentation and showcasing usage examples.
 *
 * @tagName doc-demo
 * @alpha
 */
export class DocDemo extends Component {
	/**
	 * Sets the default view mode for the demo component, allowing switching between mobile,
	 * desktop, and source views for enhanced example interactivity.
	 * @attribute
	 */
	view: 'desktop' | 'mobile' | 'source' = 'mobile';

	header =
		'<style>html{overflow:hidden;color: var(--cxl-color-on-background);background-color:var(--cxl-color-background)}</style>';
	libraries?: string;

	formatter?: (source: string) => string;

	getLibraryUrl(lib: string) {
		return `https://cdn.jsdelivr.net/npm/${lib}`;
	}
}

component(DocDemo, {
	tagName: 'doc-demo',
	init: [attribute('view'), attribute('libraries'), attribute('header')],
	augment: [
		css(`
  :host {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--cxl-color-outline-variant);
    border-radius: 4px;
    position: relative;
	min-height:138px;
  }
  .parent {
    visibility: hidden; 
    flex-grow: 1;
    padding: 40px 0 0 0;
  }
  .container {
    margin: 0 auto;
    width: 100%;
    min-height: 100%;
    max-height: 740px;
    overflow-x: hidden;
    overflow-y: hidden;
  }
  @media (max-width: 768px) {
    .cmobile {
      padding-bottom: 0;
    }
  }
  .source {
  	display: none;
    font: var(--cxl-font-code); 
    overflow-y: auto;
    flex-grow: 1;
    margin-top: 40px;
    min-height: 64px;
	position: absolute;
	inset: 0;
	text-align: initial;
	white-space: pre-wrap;
  }
  
  .visible { display: block; visibility: visible; }
  .hide { display: none; }
  .tabs { flex-grow: 1; }
  #ticon{ padding-left:8px; padding-right:8px;}
  
  #toolbar {
    justify-content: right;
    background-color: transparent;
    z-index: 1;
    position: absolute;
    right: 8px;
	gap: 16px;
    top: 0px;
	height: 40px;
	padding: 0 12px;
	align-items: center;
	display: flex;
  }
	`),
		host => {
			const view = get(host, 'view');
			const iframeClass = be('container');
			const example = tsx(Iframe, { className: iframeClass });
			const source = tsx(Span, {
				$: el =>
					onVisible(el).tap(() => {
						if (host.formatter)
							el.innerHTML = host.formatter(rawSource);
						else el.innerText = rawSource;
					}),
				className: view.map(v =>
					v === 'source' ? 'source visible hljs' : 'source',
				),
			});
			const viewSourceBtn = tsx(
				ButtonText,
				{
					$: el => onAction(el).tap(() => (host.view = 'source')),
					className: get(host, 'view').map(v =>
						v === 'source' ? 'hide' : '',
					),
					title: 'See source',
				},
				tsx(Icon, { name: 'code' }),
				'Code',
			);
			const closeSourceBtn = tsx(IconButton, {
				$: el => onAction(el).tap(() => (host.view = 'mobile')),
				height: 20,
				className: get(host, 'view').map(v =>
					v === 'source' ? '' : 'hide',
				),
				icon: 'close',
				title: 'Close source',
			});
			const toolbar = tsx(
				'div',
				{ id: 'toolbar' },
				tsx('slot', { name: 'toolbar' }),
				tsx(IconButton, {
					$: el =>
						onAction(el).tap(async () => {
							await navigator.clipboard.writeText(rawSource);
							el.icon = 'done';
							setTimeout(() => (el.icon = 'content_copy'), 2000);
						}),
					height: 20,
					icon: 'content_copy',
					title: 'Copy source to clipboard',
					className: view.map(v =>
						v === 'source' ? 'icon' : `icon hide`,
					),
				}),
				viewSourceBtn,
				closeSourceBtn,
			);

			let rawSource: string;

			function updateView(val: string) {
				const isDesktop = val === 'desktop';
				iframeClass.next(isDesktop ? 'container' : 'container cmobile');
			}

			function render() {
				const src = host.childNodes[0]?.textContent?.trim() || '';
				if (!src) return;
				const header = host.libraries
					? host.libraries
							.split(',')
							.map(
								lib =>
									`<script type="module" src="${host.getLibraryUrl(
										lib,
									)}"></script>`,
							)
							.join('')
					: '';
				example.srcdoc = `${host.header}${header}${src}`;
				rawSource = src;
			}

			getShadow(host).append(
				toolbar,
				tsx(
					Span,
					{
						className: view.map(v =>
							v === 'source' ? 'parent' : `parent visible ${v}`,
						),
					},
					example,
				),
				source,
			);

			return merge(
				get(host, 'view').tap(updateView),
				onVisible(host).switchMap(() =>
					observeChildren(host).raf(render),
				),
			);
		},
	],
});
