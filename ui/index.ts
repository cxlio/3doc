export * from './a.js';
export * from './appbar.js';
export * from './card.js';
export * from './code.js';
export * from './grid.js';
export * from './root.js';
export * from './page.js';
export * from './nav-list.js';
export * from './item.js';
export * from './search-page.js';
export * from './demo-bare.js';
export * from './demo.js';
export * from './app.js';
export * from './page-header.js';
export * from './group.js';

import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';
import typescript from 'highlight.js/lib/languages/typescript';

hljs.registerLanguage('html', xml);
hljs.registerLanguage('typescript', typescript);
window.hljs = hljs;
