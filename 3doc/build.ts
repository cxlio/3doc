import { buildLibrary, file, esbuild, buildDocs } from '@cxl/build';
import { concat } from '@cxl/rx';

await buildLibrary({
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
		),
	],
});
