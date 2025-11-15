import { buildLibrary, exec, file, esbuild } from '@cxl/build';
import { concat } from '@cxl/rx';

buildLibrary({
	target: 'package',
	outputDir: '../dist/3doc/package',
	tasks: [
		concat(
			esbuild({
				entryPoints: ['../ui/index.js'],
				platform: 'browser',
				outfile: '../dist/3doc/package/3doc.js',
				splitting: false,
				tsconfig: '../ui/tsconfig.json',
			}),
			file('hljs.css', 'hljs.css'),
		),
	],
});
