import { relative } from "path";
import { Kind, Output, Node, Source } from "../dts/index.js";
import type { DocGen, File } from "./index.js";

function serialize(key: string, value: unknown) {
	const cwd = process.cwd();

	if (key === "source") {
		const src = value as Source;
		const pos = src.sourceFile?.getLineAndCharacterOfPosition(src.index);
		return src.sourceFile
			? {
					fileName: relative(cwd, src.sourceFile.fileName),
					line: pos?.line,
					ch: pos?.character,
			  }
			: undefined;
	}

	if (value && (value as Node).kind === Kind.Reference) {
		const node = value as Node;
		return {
			id: node.type?.id,
			name: node.name,
			kind: Kind.Reference,
			typeParameters: node.typeParameters,
		};
	}
	return value;
}

export function render(_app: DocGen, output: Output): File[] {
	return [
		{
			name: "docs.json",
			content: JSON.stringify({ modules: output.modules }, serialize, 2),
		},
	];
}
