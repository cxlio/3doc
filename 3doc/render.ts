import { existsSync } from 'fs';
import { dirname, join, resolve, relative } from 'path';
import { ParametersResult, mkdirp, readJson, sh } from '@cxl/program';
import {
	Kind,
	Output,
	BuildOptions,
	build,
	buildConfig,
} from '../dts/index.js';
import type { File } from './index.js';

export interface ExtraDocumentation {
	title: string;
	icon?: string;
	file: string;
	index?: boolean;
}

export interface Package {
	name: string;
	version: string;
	browser?: string;
	repository?: string | { url: string; directory?: string };
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

export interface DocsJson extends BuildDocsOptions {
	extra?: Section[];
}

type BuildDocsArguments = {
	-readonly [Key in keyof DocsJson]: DocsJson[Key];
} & {
	clean: boolean;
	debug: boolean;
	outputDir: string;
	packageJson: string;
	rootDir: string;
	summary: boolean;
	tsconfig: string;
};

export type Configuration = DocsJson & {
	modulePackage: Package;
	spa: boolean;
	outputDir: string;
};

export interface VersionJson {
	all: string[];
}

export type BuildDocsOptions = Omit<ParametersResult<typeof Parameters>, '$'>;

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
	markdownSummary: {
		help: 'Enables output of documentation as markdown summary.',
		type: 'boolean',
	},
	typeRoots: {
		help: 'Specify additional type root directories (paths) for TypeScript projects (can be used multiple times).',
		type: 'string',
		many: true,
	},
	docsJson: {
		help: 'Path to a custom "3doc.json" file for configuring documentation generation.',
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
const ENTITIES_MAP: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'"': '&quot;',
};

export function escape(str: string): string {
	return str.replace(
		ENTITIES_REGEX,
		e => ENTITIES_MAP[e] ?? e,
	);
}

export function parseExample(value: string): { title: string; value: string } {
	if (value.startsWith('<caption>')) {
		const newLine = value.indexOf('\n');

		return {
			title: value.slice(0, newLine).trim().replace('</caption>', ''),
			value: value.slice(newLine).trim(),
		};
	}

	return { title: '', value };
}

export function buildDts(args: BuildDocsOptions, pkg: Package): Output {
	const { file, typeRoots, rootDir } = args;
	const dtsOptions: BuildOptions = {
		rootDir,
		exportsOnly: true,
		customJsDocTags: args.customJsDocTags,
		cxlExtensions: args.cxlExtensions ?? false,
		forceExports: args.exports,
		followReferences: args.followReferences,
	};

	return file?.[0]
		? buildConfig(
				{
					compilerOptions: {
						allowJs: true,
						baseUrl: relative(rootDir ?? '', dirname(file[0])),
						sourceMap: false,
						module: 'nodenext',
						moduleResolution: 'nodenext',
						typeRoots: typeRoots || [],
						noEmit: true,
						lib: pkg.browser ? ['esnext', 'dom'] : ['esnext'],
					},
					files: file.map(f => (rootDir ? relative(rootDir, f) : f)),
				},
				rootDir ?? process.cwd(),
				dtsOptions,
			)
		: build(args.tsconfig, dtsOptions);
}

function resolvePaths(path: string | string[], dir: string) {
	if (Array.isArray(path)) return path.map(p => resolve(dir, p));

	return resolve(dir, path);
}

function isArgument(name: string): name is keyof BuildDocsOptions {
	return name in Parameters;
}

export async function buildDocs(
	config: BuildDocsOptions,
	writeFile: (file: File, outDir: string) => Promise<void>,
): Promise<void> {
	const rootDir = resolve(
		config.rootDir ?? (config.tsconfig ? dirname(config.tsconfig) : ''),
	);
	const args: BuildDocsArguments = {
		outputDir: './docs',
		clean: false,
		debug: false,
		tsconfig: join(rootDir, 'tsconfig.json'),
		packageJson: join(rootDir, 'package.json'),
		summary: false,
		...config,
		rootDir,
	};

	const docsJson = args.docsJson ?? join(rootDir, '3doc.json');
	if (existsSync(docsJson)) {
		const newConfig = await readJson<DocsJson>(docsJson);
		const pathArgs = [
			'scripts',
			'demoScripts',
			'packageJson',
			'file',
			'tsconfig',
			'typeRoots',
		];
		for (const arg in newConfig) {
			const docsJsonDir = dirname(docsJson);
			if (arg === 'extra') {
				args.extra = (newConfig.extra ?? []).map(
					section => ({
						...section,
						items: section.items.map(item => ({
							...item,
							file: resolve(docsJsonDir, item.file),
						})),
					}),
				);
			} else if (isArgument(arg)) {
				const value = newConfig[arg];
				Object.assign(args, {
					[arg]:
						pathArgs.includes(arg) &&
						(typeof value === 'string' || Array.isArray(value))
							? resolvePaths(value, docsJsonDir)
							: value,
				});
			}
		}
	}

	function doClean(dir: string) {
		if (!dir) throw new Error('Invalid dir');
		return sh(
			`find "${dir}" -mindepth 1 -maxdepth 1 \\( -type f -o -type l \\) -delete`,
		);
	}

	const outputDir = args.outputDir;
	const pkgRepo = await readJson<Package>(args.packageJson);

	await mkdirp(outputDir);
	await mkdirp(outputDir + '/' + pkgRepo.version);

	if (args.clean) {
		await doClean(outputDir);
		await doClean(join(outputDir, pkgRepo.version));
	}

	if (args.repository === undefined && pkgRepo.repository) {
		const repo = pkgRepo.repository;
		args.repository = typeof repo === 'string' ? repo : repo.url;
	}

	const json = buildDts(args, pkgRepo);

	const docgenConfig: Configuration = {
		...args,
		modulePackage: pkgRepo,
		spa: true,
	};

	if (args.summary) {
		const summary = await import('./render-summary.js');
		await Promise.all(
			summary
				.render(docgenConfig, json)
				.map(f => writeFile(f, outputDir)),
		);
	}

	if (args.markdownSummary) {
		const { render } = await import('./render-md.js');
		await Promise.all(
			render(docgenConfig, json).map(f => writeFile(f, outputDir)),
		);
	}

	if (!args.noHtml) {
		const theme = await import('./render-html.js');
		await Promise.all(
			theme.render(docgenConfig, json).map(f => writeFile(f, outputDir)),
		);
	}
}
