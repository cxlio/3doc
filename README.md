TypeScript/JavaScript API documentation generator that builds versioned static HTML and JSON with Markdown/JSDoc support, and custom tags.


## Features

- Generates docs from a TypeScript project (`tsconfig.json`) or from specific files (`--file`).
- Output formats:
    - HTML (default)
    - `summary.json` (`--summary`)
- Supports custom JSDoc tags (`--customJsDocTags`)
- Can include extra scripts/styles for docs and demos (`--scripts`, `--demoScripts`, `--demoStyles`)
- Reads optional `3doc.json` config file.

## Example outputs (generated docs)

- 3doc API: https://cxlio.github.io/docs/@cxl/3doc/
- TypeScript compiler API (`typescript.d.ts`): https://cxlio.github.io/docs/typescript/
- TypeScript DOM API (`lib.dom.d.ts`): https://cxlio.github.io/docs/dom/
- Coaxial UI (web components) docs + demos: https://cxlio.github.io/docs/@cxl/ui/

### Commands used

```sh
# this project
3doc --cxlExtensions --tsconfig "3doc/tsconfig.json" --rootDir "3doc" --markdown

# TypeScript compiler API
3doc --file "node_modules/typescript/lib/typescript.d.ts" --outputDir "docs/typescript" --markdown --rootDir node_modules/typescript

# DOM API
3doc --file "node_modules/typescript/lib/lib.dom.d.ts" --outputDir "docs/dom" --packageName DOM --markdown --rootDir node_modules/typescript
```

## Usage

Typical usage is “generate docs into `./docs`”:

```sh
3doc --tsconfig ./tsconfig.json --outputDir ./docs
```

Generate HTML (default) plus a JSON summary:

```sh
3doc --summary
```

Disable HTML generation:

```sh
3doc --noHtml --summary
```

Generate docs for one or more files:

```sh
3doc --file src/index.ts --file src/other.ts
```

## Configuration (`3doc.json`)

If `3doc.json` exists in the project root (or is provided via `--docsJson`), it is merged into CLI args.

Example:

```json
{
	"outputDir": "./docs",
	"clean": true,
	"tsconfig": "./tsconfig.json",
	"summary": true,
	"markdownSummary": true,
	"noHtml": false,
	"scripts": ["./assets/docs.js"],
	"demoScripts": ["./assets/demo.js"],
	"demoStyles": ".demo { padding: 1rem; }"
}
```

## Output structure

By default docs are written to:

- `./docs/` (or `--outputDir`)
- plus a versioned directory: `./docs/<package.json version>/`

## CLI options

Common options (from `render.ts`):

- `--outputDir, -o <dir>`: output directory (default `./docs`)
- `--clean`: delete existing files in output directories before generating
- `--tsconfig <path>`: tsconfig path (default `tsconfig.json`)
- `--packageJson <path>`: package.json path (default `<rootDir>/package.json`)
- `--packageName <name>`: override doc title
- `--repository <url>`: repository URL (defaults to `package.json#repository`)
- `--file <path>` (repeatable): generate docs for specific files
- `--exclude <path>` (repeatable): exclude modules/paths
- `--typeRoots <path>` (repeatable): extra TS type roots
- `--rootDir <path>`: override TS root dir used for resolving file names
- `--customJsDocTags <tag>` (repeatable): custom JSDoc tags
- `--cxlExtensions`: enable Coaxial UI extensions support
- `--exports <path>` (repeatable): force specific symbols as exported
- `--followReferences`: include docs from project references
- `--markdown`: render markdown inside symbol descriptions
- `--summary`: emit `summary.json`
- `--markdownSummary`: emit markdown summary output
- `--sitemap <baseUrl>`: generate sitemap with base URL
- `--baseHref <url>`: base URL for markdown links
- `--headHtml <path>`: add custom HTML to `<head>`
- `--noHtml`: do not generate HTML


## Packages

| Name           | Version | License | Description                          | Links                                          |
| -------------- | ------- | ------- | ------------------------------------ | ---------------------------------------------- |
| @cxl/3doc            | [1.0.0-beta.3](https://npmjs.com/package/@cxl/3doc/v/1.0.0-beta.3) | SEE LICENSE IN LICENSE.md | TypeScript/JavaScript API documentation generator that builds versioned static HTML and JSON with Markdown/JSDoc support, and custom tags. | [Docs](https://cxlio.github.io/docs/@cxl/3doc/1.0.0/) |
| @cxl/dts             | [0.5.0](https://npmjs.com/package/@cxl/dts/v/0.5.0) | GPL-3.0-only | Generate a JSON AST of your TypeScript public API (exports, types, JSDoc) from tsconfig or source, resolving symbols and project references for documentation. | [Docs](https://cxlio.github.io/docs/@cxl/dts/1.0.0/) |
| @cxl/3doc.ui         | 1.0.0 | GPL-3.0    | Client-side UI components and runtime for 3doc. | [Docs](https://cxlio.github.io/docs/@cxl/3doc.ui/1.0.0/) |

