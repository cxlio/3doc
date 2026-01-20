import { buildLibrary, file, esbuild, buildDocs } from '@cxl/build';
import { concat } from '@cxl/rx';

await buildLibrary(
	{
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
	},
	{
		target: 'docs',
		outputDir: '../docs/typescript',
		tasks: [
			buildDocs({
				file: ['../node_modules/typescript/lib/typescript.d.ts'],
				packageJson: '../node_modules/typescript/package.json',
				spa: true,
			}),
		],
	},
	{
		target: 'docs',
		outputDir: '../docs/prettier',
		tasks: [
			buildDocs({
				file: [
					'../node_modules/prettier/index.d.ts',
					'../node_modules/prettier/doc.d.ts',
					'../node_modules/prettier/doc.js',
				],
				packageJson: '../node_modules/prettier/package.json',
				spa: true,
			}),
		],
	},
);
