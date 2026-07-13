import { relative } from 'path';
import { Kind, Output, Node, Source } from '../dts/index.js';
import type { File } from './index.js';
import type { Configuration } from './render.js';

type JsonValue = Source | Node | string | number | boolean | null | undefined;

function isSource(value: JsonValue): value is Source {
	return (
		typeof value === 'object' &&
		value !== null &&
		'index' in value &&
		'sourceFile' in value
	);
}

function isReference(value: JsonValue): value is Node {
	return (
		typeof value === 'object' &&
		value !== null &&
		'kind' in value &&
		value.kind === Kind.Reference
	);
}

function serialize(key: string, value: JsonValue) {
	const cwd = process.cwd();

	if (key === 'source' && isSource(value)) {
		const pos = value.sourceFile?.getLineAndCharacterOfPosition(value.index);
		return value.sourceFile
			? {
					fileName: relative(cwd, value.sourceFile.fileName),
					line: pos?.line,
					ch: pos?.character,
				}
			: undefined;
	}

	if (isReference(value)) {
		const node = value;
		return {
			id: node.type?.id,
			name: node.name,
			kind: Kind.Reference,
			typeParameters: node.typeParameters,
		};
	}
	return value;
}

export function render(_app: Configuration, output: Output): File[] {
	return [
		{
			name: 'docs.json',
			content: JSON.stringify({ modules: output.modules }, serialize, 2),
		},
	];
}
