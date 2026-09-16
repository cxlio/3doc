#!/usr/bin/env node
import { promises as fs } from "fs";
import { join } from "path";
import { program, parseArgv } from "@cxl/program";
import type { Node } from "../dts/index.js";

import { Parameters, buildDocs } from "./render.js";

export { type BuildDocsOptions, buildDts, buildDocs } from "./render.js";
export {
	type SummaryJson,
	type Summary,
	renderJson,
	findExamples,
} from "./render-summary.js";
export { Flags, Kind } from "../dts/index.js";

export interface File {
	name: string;
	content: string;
	title?: string;
	node?: Node;
}

if (import.meta.main) {
	await program({}, async ({ log }) => {
		async function writeFile(file: File, out: string) {
			const name = file.name;
			const dest = join(out, name);
			log(`Writing ${dest}${file.node ? ` from ${file.node.name}` : ""}`);
			await Promise.all([fs.writeFile(dest, file.content)]);
		}

		try {
			await buildDocs(parseArgv(Parameters), writeFile);
		} catch (e) {
			console.error(e);
			process.exitCode = 1;
		}
	})();
}
