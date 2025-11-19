import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { ParametersResult, Package, mkdirp, readJson, sh } from '@cxl/program';
import { Kind, BuildOptions, build, buildConfig } from '../dts/index.js';
import type { DocGen, File } from './index.js';

export interface ExtraDocumentation {
	title: string;
	icon?: string;
	file: string;
	index?: boolean;
}

export interface RuntimeConfig {
	packageName: string;
	activeVersion: string;
	versions: string;
	repository?: string;
	demoScripts?: string[];
	demoStyles?: string;
	spa: boolean;
	symbols: {
		name: string;
		tagName?: string;
		icon?: string;
		kind: Kind;
		href?: string;
	}[];
}

export interface Section {
	title?: string;
	items: ExtraDocumentation[];
}

export interface DocsJson {
	extra: Section[];
}

export interface VersionJson {
	all: string[];
}

export const Parameters = {
	repository: {
		type: 'string',
		help: 'URL of the source code repository (e.g., GitHub repository URL)',
	},
	clean: {
		help: 'Removes all existing files from the output directory before generating documentation.',
	},
	outputDir: {
		short: 'o',
		type: 'string',
		help: 'Specifies the output directory where the generated documentation will be saved.',
	},
	scripts: {
		type: 'string',
		many: true,
		help: 'List of additional scripts (paths) to include in the generated documentation HTML.',
	},
	demoScripts: {
		type: 'string',
		many: true,
		help: 'List of scripts (paths) to include in the generated documentation demo output.',
	},
	demoStyles: {
		type: 'string',
		help: 'CSS styles to include in the generated demo output.',
	},
	packageJson: {
		help: 'Path to the package.json file. Defaults to "./package.json" if not specified.',
		type: 'string',
	},
	packageName: {
		help: 'Sets the title of the generated documentation. Defaults to the name property in package.json.',
		type: 'string',
	},
	summary: {
		help: 'Enables generation of a "summary.json" file.',
		type: 'boolean',
	},
	sitemap: {
		help: 'Generates a sitemap for the documentation using the provided value as the base URL.',
		type: 'string',
	},
	file: {
		help: 'Allows parsing of a single file instead of an entire project.',
		type: 'string',
		many: true,
	},
	tsconfig: {
		help: 'Path to the tsconfig.json file used for TypeScript compilation. Defaults to "./tsconfig.json" if not specified.',
		type: 'string',
	},
	markdown: {
		help: 'Enables rendering of markdown syntax within symbol descriptions.',
		type: 'boolean',
	},
	typeRoots: {
		help: 'Specify additional type root directories (paths) for TypeScript projects (can be used multiple times).',
		type: 'string',
		many: true,
	},
	docsJson: {
		help: 'Path to a custom "docs.json" file for configuring documentation generation.',
		type: 'string',
	},
	baseHref: {
		help: 'Sets the base URL for markdown links within the generated documentation.',
		type: 'string',
	},
	exclude: {
		help: 'List of modules (paths) to exclude from documentation generation (can be used multiple times).',
		type: 'string',
		many: true,
	},
	rootDir: {
		help: 'Overrides the default root directory used for resolving TypeScript project file names.',
		type: 'string',
	},
	customJsDocTags: {
		help: 'Allows declaration of custom jsdoc tags for documentation (can be used multiple times).',
		type: 'string',
		many: true,
	},
	cxlExtensions: {
		help: 'Enables support for Coaxial UI extensions within the generated documentation.',
		type: 'boolean',
	},
	exports: {
		help: 'Treats specific symbols (paths) as exported even if not explicitly marked.',
		type: 'string',
		many: true,
	},
	followReferences: {
		help: 'Includes documentation from symbols referenced in project references.',
		type: 'boolean',
	},
	headHtml: {
		help: 'Path to a file containing custom HTML to be added to the `<head>` element of the generated page.',
		type: 'string',
	},
	noHtml: {
		help: 'Do not generate HTML',
		type: 'boolean',
	},
	debug: {
		help: 'Enables debug mode to print detailed output during documentation generation.',
		type: 'boolean',
	},
} as const;

const ENTITIES_REGEX = /[&<"]/g;
const ENTITIES_MAP = {
	'&': '&amp;',
	'<': '&lt;',
	'"': '&quot;',
};

export function escape(str: string) {
	return str.replace(
		ENTITIES_REGEX,
		e => ENTITIES_MAP[e as keyof typeof ENTITIES_MAP],
	);
}

export function parseExample(value: string) {
	if (value.startsWith('<caption>')) {
		const newLine = value.indexOf('\n');

		return {
			title: value.slice(0, newLine).trim().replace('</caption>', ''),
			value: (value = value.slice(newLine).trim()),
		};
	}

	return { title: '', value };
}

export async function buildDocs(
	config: ParametersResult<typeof Parameters>,
	writeFile: (file: File, outDir: string) => void,
) {
	const args = {
		outputDir: './docs',
		clean: false,
		debug: false,
		spa: false,
		tsconfig: 'tsconfig.json',
		packageJson: 'package.json',
		packageRoot: '',
		summary: false,
		...config,
	};

	if (args.docsJson || existsSync('3doc.json')) {
		Object.assign(args, await readJson(args.docsJson || '3doc.json'));
	}

	function doClean(dir: string) {
		return sh(`rm -f ${dir}/*.html ${dir}/*.json ${dir}/*.js`);
	}

	const outputDir = args.outputDir;
	const pkgRepo = await readJson<Package>(args.packageJson);

	args.packageRoot ??= dirname(resolve(args.packageJson));
	await mkdirp(outputDir);
	await mkdirp(outputDir + '/' + pkgRepo.version);

	if (args.clean) {
		await doClean(outputDir);
		await doClean(join(outputDir, pkgRepo.version));
	}

	if (args.repository === undefined && pkgRepo?.repository) {
		const repo = pkgRepo.repository;
		args.repository = typeof repo === 'string' ? repo : repo.url;
	}

	const dtsOptions: BuildOptions = {
		rootDir: args.rootDir,
		exportsOnly: true,
		customJsDocTags: args.customJsDocTags,
		cxlExtensions: args.cxlExtensions || false,
		forceExports: args.exports,
		followReferences: args.followReferences,
	};
	const json = args.file?.length
		? buildConfig(
				{
					compilerOptions: {
						allowJs: true,
						rootDir: dirname(args.file[0]),
						sourceMap: false,
						typeRoots: args.typeRoots || [],
						noEmit: true,
						lib: ['es2021'],
					},
					files: args.file,
				},
				process.cwd(),
				dtsOptions,
		  )
		: build(args.tsconfig, dtsOptions);

	const docgenConfig: DocGen = {
		...args,
		modulePackage: pkgRepo,
		repositoryLink: args.repository,
	};

	if (args.summary) {
		const summary = await import('./render-summary.js');
		await Promise.all(
			summary
				.render(docgenConfig, json)
				.map(f => writeFile(f, outputDir)),
		);
	}

	if (!args.noHtml) {
		const theme = await import('./render-html.js');
		await Promise.all(
			theme.render(docgenConfig, json).map(f => writeFile(f, outputDir)),
		);
	}
}
