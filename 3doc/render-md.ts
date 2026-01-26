import { Kind, Flags } from '../dts/enum.js';
import { GroupTitle } from './localization.js';

import type { Node, Output, Documentation, DocumentationContent } from '../dts';
import type { DocGen, File } from './index.js';

export interface SummaryJson {
	index: Summary[];
}

export interface Summary {
	id?: number;
	name?: string;
	kind: Kind;
	flags?: Flags;
	docs?: Documentation;
	parameters?: Summary[];
	children?: Summary[];
	type?: string | Summary | number;
	typeP?: Summary[];
	resolvedType?: string | Summary;
}

function sortByName(a: { name: string }, b: { name: string }) {
	return a.name < b.name ? -1 : 1;
}

function getDocValue(content: DocumentationContent['value']) {
	if (typeof content === 'string') return content;

	return content.map(doc => doc.value).join(' ');
}

function getHref(node: Summary) {
	return node.name ? `docs/ui-${node.name}` : undefined;
}

export function link(node: Summary): string {
	const href = getHref(node);
	const name = node.name ?? '?';
	return href ? `[${name}](${href})` : name;
}

export function renderNode(node: Node, all: Node[]) {
	function getRef(type: string | number | Summary | undefined) {
		if (!type || typeof type === 'string') return;
		if (typeof type === 'number') return all.find(n => n.id === type);
	}

	function getTypeSummary(
		type: string | number | Summary | undefined,
	): Summary | undefined {
		if (!type || typeof type === 'string') return;

		if (typeof type === 'number') {
			const ref = all.find(n => n.id === type);
			if (ref && (ref.kind === Kind.Interface || ref.kind === Kind.Class))
				return ref;
			return ref
				? getTypeSummary(ref.resolvedType ?? ref.type)
				: undefined;
		}

		if (type.kind === Kind.Reference) return getRef(type.type);

		return type;
	}

	function getType(
		type: string | number | Summary | undefined,
	): string | Summary | undefined {
		if (!type) return;
		if (typeof type === 'string') return type;
		return (
			getTypeSummary(type) ??
			(typeof type === 'number' ? undefined : type.name)
		);
	}

	function typeArguments(types?: Summary[]): string {
		return types
			? '&lt;' +
					types
						.map(
							t =>
								renderType(t) +
								(t.kind !== Kind.Reference && t.type
									? ` extends ${renderType(t.type)}`
									: ''),
						)
						.join(', ') +
					'&gt;'
			: '';
	}

	function objectType(node: Summary) {
		const result = node.children?.map(signature).join(' | ') ?? '';
		return `{ ${result} }`;
	}

	function renderType(
		nodeType: string | number | Summary | undefined,
	): string | undefined {
		const type = getType(nodeType);
		if (!type || typeof type === 'string') return type || '?';

		switch (type.kind) {
			case Kind.TypeUnion:
				return type.children?.map(renderType).join(' | ');
			case Kind.Literal:
			case Kind.BaseType:
				return type.name ?? '?';
			case Kind.ObjectType:
				return objectType(type);
			case Kind.Array:
				return `${renderType(type.type)}[]`;
			case Kind.Interface:
			case Kind.Class:
			case Kind.Component: {
				const typeArgs = type.typeP
					? typeArguments(type.typeP)
					: undefined;
				return `${link(type)}${typeArgs}`;
			}
			case Kind.FunctionType:
				return signature(type);
			case Kind.ClassType: {
				const ref = getRef(nodeType);
				return ref ? link(ref) : (type.name ?? '?');
			}
			case Kind.IndexedType:
				return `
						${renderType(type.children?.[0])}[
						${renderType(type.children?.[1])}]
				`;
			default:
				console.log(type.name);
		}

		return undefined;
	}

	function parameter(p: Summary) {
		const flags = p.flags ?? 0;
		const modifiers =
			flags & Flags.Public
				? 'public '
				: flags & Flags.Private
					? 'private'
					: flags & Flags.Protected
						? 'protected '
						: '';

		const name = `${modifiers}${flags & Flags.Rest ? '...' : ''}${p.name}${
			flags & Flags.Optional ? '?' : ''
		}`;
		return `${name}: ${renderType(p.type)}`;
	}

	function parameters(params: Summary[] | undefined) {
		return `(${params?.map(parameter).join(', ')}`;
	}

	function isFunction(node: Summary) {
		return (
			node.kind === Kind.FunctionType ||
			node.kind === Kind.Function ||
			node.kind === Kind.Method ||
			node.kind === Kind.Setter
		);
	}

	function signaturePrefix(node: Summary) {
		const flags = node.flags ?? 0;
		const getOrSet =
			node.kind === Kind.Getter
				? 'get '
				: node.kind === Kind.Setter
					? 'set '
					: undefined;

		return `${flags & Flags.Static ? 'static ' : ''}${
			flags & Flags.Readonly ? 'readonly ' : ''
		}${flags & Flags.Abstract ? 'abstract ' : ''}${getOrSet}`;
	}
	function indexSignature(node: Summary) {
		const params = node.parameters?.map(signature) || '';
		return `[${params}]: ${node.type ? renderType(node.type) : '?'}`;
	}

	function signature(node: Summary): string {
		if (node.kind === Kind.IndexSignature) return indexSignature(node);
		if (node.kind === Kind.Spread && node.children?.[0])
			return `...${renderType(node.children[0])}`;

		const optional = node.flags && node.flags & Flags.Optional;
		const params = isFunction(node)
			? parameters(node.parameters)
			: undefined;
		const isType = node.kind === Kind.FunctionType;
		return `${signaturePrefix(node)}${node.name}${
			optional ? '?' : ''
		}${params}${isType ? ' => ' : ': '}${renderType(
			node.resolvedType ?? node.type,
		)}`;
	}

	function renderMember(node: Summary) {
		return `### ${signature(node)}
${renderDocumentation(node)}
`;
	}

	function Members(node: Summary, filter?: (n: Summary) => boolean) {
		if (!node.children) return [];
		const groups: { [K in Kind]?: { name: string; nodes: Summary[] } } = {};

		for (const child of node.children)
			if (
				child.kind !== Kind.Constructor &&
				child.kind !== Kind.Unknown &&
				(child.flags || 0) & Flags.Public &&
				!filter?.(child)
			)
				(groups[child.kind] ??= {
					name: GroupTitle[child.kind] ?? '',
					nodes: [],
				}).nodes.push(child);

		return Object.values(groups)
			.sort(sortByName)
			.map(group => {
				return `## ${group.name}
${group.nodes.map(renderMember)}
`;
			});
	}

	function Demo(value: string) {
		let title: string | undefined;
		value = value.replace(/<caption>(.+?)<\/caption>/, (_, val) => {
			title = val;
			return '';
		});
		return `## ${title || 'Demo:'}}
${value}
`;
	}

	function findByName(name: string) {
		return all.find(s => s.name === name);
	}

	function DocSee(docs: DocumentationContent[]) {
		const output = docs.flatMap(doc => {
			const value = doc.value;
			let output: string = getDocValue(value);
			if (typeof value === 'string') {
				const symbol = findByName(value);
				output = symbol ? link(symbol) : value;
			}
			return [output, ', '];
		});
		output.pop();

		return `Related: ${output}\n`;
	}

	function renderDocumentation(node: Summary) {
		const docs = node.docs;

		if (!docs?.content) return '';

		const related: DocumentationContent[] = [];
		const result = docs.content.map(doc => {
			const text = getDocValue(doc.value);

			if (doc.tag === 'icon') return '';
			if (doc.tag === 'title') return '';
			if (
				doc.tag === 'example' ||
				doc.tag === 'demo' ||
				doc.tag === 'demoonly'
			)
				return Demo(text);
			if (doc.tag === 'see') {
				related.push(doc);
				return '';
			}
			if (doc.tag === 'return') return `Returns: ${text}`;
			if (doc.tag === 'param') return `${text}\n`;

			return doc.tag ? `${doc.tag}: ${text}` : text;
		});

		if (related.length) result.push(DocSee(related));

		return result;
	}

	function renderExtends(node: Summary | string | number) {
		const extendStr: string[] = [];
		const type = getTypeSummary(node);
		if (!type || type.kind !== Kind.ClassType) return;

		type.children?.forEach(child => {
			if (typeof child !== 'object') return;
			const entry = getTypeSummary(child);
			if (entry && entry.name !== 'Component')
				extendStr.push(link(entry));
		});
		return `${extendStr.length ? `extends ${extendStr}` : ''}`;
	}

	function renderInherited(node: Summary): string[] {
		const type = getTypeSummary(node.type);
		const result = [];
		if (!type?.children) return [];
		for (const node of type.children) {
			const nodeType = getTypeSummary(node);
			if (
				!nodeType ||
				nodeType.kind !== Kind.Component ||
				nodeType.name === 'Component'
			)
				break;
			const members = Members(
				nodeType,
				n => !!((n.flags ?? 0) & Flags.Abstract),
			);

			if (members.length)
				result.push(`Inherited from ${link(nodeType)}`, ...members);

			result.push(...renderInherited(nodeType));
		}

		return result;
	}

	const name = node.name;
	const tagName = node.kind === Kind.Component && node.docs?.tagName;

	return `# ${name}${tagName ? ` (${tagName})` : ''}
${node.type && renderExtends(node.type)}

${renderDocumentation(node)}
${Members(node)}
${renderInherited(node)}
	`;
}

export function render(app: DocGen, output: Output): File[] {
	const index = Object.values(output.index);
	const md = index.map(d => renderNode(d, index)).join('');
	const version = app.modulePackage.version;

	return [
		{
			name: version ? `${version}/index.md` : 'index.md',
			content: md,
		},
	];
}
