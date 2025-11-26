export * from './appbar.js';
export * from './card.js';
export * from './code.js';
export * from './grid.js';
export * from './root.js';
export * from './page.js';
export * from './nav-list.js';
export * from './item.js';
export * from './search-page.js';

import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';

hljs.registerLanguage('html', xml);
window.hljs = hljs;
