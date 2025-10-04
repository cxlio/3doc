#!/usr/bin/env node
import { promises as fs } from 'fs';
import { Package, program, parseArgv } from '@cxl/program';
import { Node } from '../dts/index.js';

import { Parameters, Section, buildDocs } from './render.js';

export interface File {
	name: string;
	content: string;
	title?: string;
	node?: Node;
}

/**
 * The `DocGen` interface outlines the configuration structure for generating documentation. It specifies essential
 * options like the output directory, TypeScript configuration, and optional features such as sitemap generation
 * and markdown rendering.
 */
export interface DocGen {
	/**
	 * @description Specifies the output directory where the generated documentation will be saved.
	 * @cli `--outputDir`, `-o`
	 */
	outputDir: string;

	/**
	 * @description URL of the source code repository (e.g., GitHub repository URL).
	 * @cli `--repository`
	 */
	repository?: string;

	/**
	 * @description Link to the repository for the documentation site.
	 * @cli `--repositoryLink`
	 */
	repositoryLink?: string;

	/**
	 * @description Removes all existing files from the output directory before generating documentation.
	 * @cli `--clean`
	 */
	clean: boolean;

	/**
	 * @description Enables debug mode to print detailed output during documentation generation.
	 * @cli `--debug`
	 */
	debug: boolean;

	/**
	 * @description The package information for the current project, typically sourced from `package.json`.
	 * @cli `--packageJson`
	 */
	modulePackage: Package;

	/**
	 * @description Enables Single Page Application (SPA) mode for documentation.
	 * @cli `--spa`
	 */
	spa: boolean;

	/**
	 * @description Path to the `tsconfig.json` file used for TypeScript compilation.
	 * @cli `--tsconfig`
	 */
	tsconfig: string;

	/**
	 * @description Generates a sitemap for the documentation using the provided value as the base URL.
	 * @cli `--sitemap`
	 */
	sitemap?: string;

	/**
	 * @description Path to the `package.json` file. Defaults to `./package.json` if not specified.
	 * @cli `--packageJson`
	 */
	packageJson: string;

	/**
	 * @description The root directory of the package for resolving paths.
	 * @cli `--rootDir`
	 */
	packageRoot: string;

	/**
	 * @description Sets the title of the generated documentation. Defaults to the `name` property in `package.json`.
	 * @cli `--packageName`
	 */
	packageName?: string;

	/**
	 * @description Enables generation of a `summary.json` file.
	 * @cli `--summary`
	 */
	summary: boolean;

	/**
	 * @description Additional sections to include in the documentation.
	 * @cli `--extra`
	 */
	extra?: Section[];

	/**
	 * @description List of additional scripts (paths) to include in the generated documentation HTML.
	 * @cli `--scripts`
	 */
	scripts?: string[];

	/**
	 * @description List of scripts (paths) to include in the generated documentation demo output.
	 * @cli `--demoScripts`
	 */
	demoScripts?: string[];

	/**
	 * @description Allows parsing of specific files instead of an entire project.
	 * @cli `--file`
	 */
	file?: string[];

	/**
	 * @description List of modules (paths) to exclude from documentation generation.
	 * @cli `--exclude`
	 */
	exclude?: string[];

	/**
	 * @description Path to a custom `docs.json` file for configuring documentation generation.
	 * @cli `--docsJson`
	 */
	docsJson?: string;

	/**
	 * @description Enables rendering of markdown syntax within symbol descriptions.
	 * @cli `--markdown`
	 */
	markdown?: boolean;

	/**
	 * @description Sets the base URL for markdown links within the generated documentation.
	 * @cli `--baseHref`
	 */
	baseHref?: string;

	/**
	 * @description Overrides the default root directory used for resolving TypeScript project file names.
	 * @cli `--rootDir`
	 */
	rootDir?: string;

	/**
	 * @description Allows declaration of custom JSDoc tags for documentation.
	 * @cli `--customJsDocTags`
	 */
	customJsDocTags?: string[];

	/**
	 * @description Enables support for Coaxial UI extensions within the generated documentation.
	 * @cli `--cxlExtensions`
	 */
	cxlExtensions?: boolean;

	/**
	 * @description Includes documentation from symbols referenced in project references.
	 * @cli `--followReferences`
	 */
	followReferences?: boolean;

	/**
	 * @description Treats specific symbols (paths) as exported even if not explicitly marked.
	 * @cli `--exports`
	 */
	exports?: string[];

	/**
	 * @description Path to a file containing custom HTML to be added to the `<head>` element of the generated page.
	 * @cli `--headHtml`
	 */
	headHtml?: string;

	noHtml?: boolean;
}

program({}, async ({ log }) => {
	async function writeFile(file: File, out: string) {
		const name = file.name;
		log(`Writing ${name}${file.node ? ` from ${file.node.name}` : ''}`);
		await Promise.all([fs.writeFile(`${out}/${name}`, file.content)]);
	}

	try {
		buildDocs(parseArgv(Parameters), writeFile);
	} catch (e) {
		console.error(e);
		process.exitCode = 1;
	}
})();
