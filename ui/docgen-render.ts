import { T, tsx, Child, sortBy } from '@cxl/ui';

//import { render as markdown } from '@cxl/gbc.markdown';

import { Kind, Flags } from '../dts/enum.js';

import { DocDemo } from './demo.js';

import type { DocumentationContent } from '../dts';
import { SummaryJson, Summary, docgen } from './docgen.js';

export interface DocgenOptions {
	summaryJson: SummaryJson;
	summary: Summary;
	uiCdn: string;
	link?: (node: Summary) => string | Node;
	importmap?: string;
	codeHighlight?: (src: string) => string;
}

const GroupTitle: Record<number, string> = {
	[Kind.Constant]: 'Constants',
	[Kind.Variable]: 'Variables',
	[Kind.Interface]: 'Interfaces',
	[Kind.Class]: 'Classes',
	[Kind.Property]: 'Properties',
	[Kind.Method]: 'Methods',
	[Kind.Getter]: 'Getters',
	[Kind.Setter]: 'Setters',
	[Kind.Constructor]: 'Constructor',
	[Kind.Function]: 'Functions',
	[Kind.Enum]: 'Enums',
	[Kind.Component]: 'Components',
	[Kind.Attribute]: 'Attributes',
	[Kind.TypeAlias]: 'Type Alias',
	[Kind.CallSignature]: 'Call Signature',
	[Kind.ConstructSignature]: 'Construct Signature',
	[Kind.Event]: 'Events',
	[Kind.IndexSignature]: 'Index Signature',
	[Kind.Export]: 'Exports',
	[Kind.Namespace]: 'Namespaces',
};

function getDocValue(content: DocumentationContent['value']) {
	if (typeof content === 'string') return content;

	return content.map(doc => doc.value).join(' ');
}

function getHref(node: Summary) {
	return node.name ? `docs/ui-${node.name}` : undefined;
}

export function createLink(node: Summary) {
	const href = getHref(node);
	const name = node.name ?? '?';
	return href ? tsx('a', { href }, name) : name;
}

export function docgenRender({
	summary,
	summaryJson,
	link = createLink,
	uiCdn,
	importmap,
	codeHighlight,
}: DocgenOptions) {
	const { getTypeSummary, getRef, isFunction } = docgen(summaryJson);

	const all = summaryJson.index;

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

	function objectType(node: Summary): Child[] {
		const result =
			node.children?.map(signature).flatMap(separator('; ')) ?? [];

		return ['{ ', ...result, ' }'];
	}

	function renderType(
		nodeType: string | number | Summary | undefined,
	): Child[] {
		const type = getType(nodeType);
		if (!type && nodeType) console.log(nodeType);
		if (!type || typeof type === 'string') return [type || '?'];

		switch (type.kind) {
			case Kind.TypeUnion:
				return (
					type.children?.map(renderType).flatMap(separator(' | ')) ??
					[]
				);
			case Kind.Literal:
			case Kind.BaseType:
				return [type.name ?? '?'];
			case Kind.ObjectType:
				return objectType(type) ?? ['?'];
			case Kind.Array:
				return [...renderType(type.type), '[]'];
			case Kind.Interface:
			case Kind.Class:
			case Kind.Component: {
				const typeArgs = type.typeP
					? typeArguments(type.typeP)
					: undefined;
				return [link(type), typeArgs];
			}
			case Kind.FunctionType:
				return signature(type);
			case Kind.ClassType: {
				const ref = getRef(nodeType);
				return [ref ? link(ref) : type.name ?? '?'];
			}
			case Kind.IndexedType:
				return [
					...renderType(type.children?.[0]),
					'[',
					...renderType(type.children?.[1]),
					']',
				];
			default:
				console.log(type);
		}

		return [];
	}

	function parameter(p: Summary): Child[] {
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
		return [`${name}: `, ...renderType(p.type)];
	}

	function parameters(params: Summary[] | undefined): Child[] {
		return [
			'(',
			...(params?.map(parameter).flatMap(separator(', ')) ?? []),
			')',
		];
	}

	function signaturePrefix(node: Summary): Child[] {
		const flags = node.flags ?? 0;
		const getOrSet =
			node.kind === Kind.Getter
				? 'get '
				: node.kind === Kind.Setter
				? 'set '
				: undefined;

		return [
			flags & Flags.Static ? 'static ' : '',
			flags & Flags.Readonly ? 'readonly ' : '',
			flags & Flags.Abstract ? 'abstract ' : '',
			getOrSet,
		];
	}
	function indexSignature(node: Summary): Child[] {
		const params = node.parameters?.flatMap(signature) ?? [];
		return [
			'[',
			...(params ?? []),
			']: ',
			...(node.type ? renderType(node.type) ?? [] : ['?']),
		];
	}

	function separator(
		sep: Child[] | string,
	): (n: Child[], i: number) => Child[] {
		return (n: Child[], i: number) => (i !== 0 ? [...sep, ...n] : n);
	}

	function signature(node: Summary): Child[] {
		if (node.kind === Kind.IndexSignature) return indexSignature(node);
		if (node.kind === Kind.Spread && node.children?.[0])
			return ['...', ...renderType(node.children[0])];

		const optional = node.flags && node.flags & Flags.Optional;
		const params = isFunction(node) ? parameters(node.parameters) : [];
		const isType = node.kind === Kind.FunctionType;
		return [
			...signaturePrefix(node),
			node.name,
			optional ? '?' : '',
			...params,
			isType ? ' => ' : ': ',
			...renderType(node.resolvedType ?? node.type),
		];
	}

	function renderMember(node: Summary): Child[] {
		return [
			tsx('h3', {}, tsx(T, { font: 'title-large' }, ...signature(node))),
			...renderDocumentation(node),
		];
	}

	function Members(node: Summary, filter?: (n: Summary) => boolean): Child[] {
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
					name: GroupTitle[child.kind],
					nodes: [],
				}).nodes.push(child);

		return Object.values(groups)
			.sort(sortBy('name'))
			.flatMap(group => {
				return [
					tsx('h2', {}, group.name),
					...group.nodes.flatMap(renderMember),
				];
			});
	}

	function Demo(value: string): Child[] {
		let title;
		value = value.replace(/<caption>(.+?)<\/caption>/, (_, val) => {
			title = val;
			return '';
		});
		const css = `<style>body{display:flex;align-items:center;flex-wrap:wrap;justify-content:center;overflow-x:hidden;overflow-y:auto;padding:0 24px 24px 24px;gap:32px;min-height:96px;color:var(--cxl-color-on-background);
background-color:var(--cxl-color-background)}</style>`;
		const script =
			(importmap ?? '') +
			`<script type="module" src="${uiCdn}"></script>`;
		const demo = tsx(
			DocDemo,
			{ header: css + script, formatter: codeHighlight },
			value,
		);
		return [
			title ? tsx(T, { font: 'title-medium' }, title) : undefined,
			demo,
		];
	}

	function findByName(name: string) {
		return all.find(s => s.name === name);
	}

	function DocSee(docs: DocumentationContent[]) {
		const output = docs.flatMap(doc => {
			const value = doc.value;
			let output: string | Node = getDocValue(value);
			if (typeof value === 'string') {
				const symbol = findByName(value);
				output = symbol ? link(symbol) : value;
			}
			return [output, ', '];
		});
		output.pop();

		return tsx('p', {}, 'Related: ', output);
	}

	function Markdown({ src }: { src: string }) {
		const result = tsx('div');
		result.textContent = src; //markdown(src);
		return result;
	}

	function renderDocumentation(node: Summary): Child[] {
		const docs = node.docs;

		if (!docs || !docs.content) return [];

		const related: DocumentationContent[] = [];
		const result = docs.content.flatMap(doc => {
			const text = getDocValue(doc.value);

			if (doc.tag === 'icon' || doc.tag === 'title') return [];
			if (
				doc.tag === 'example' ||
				doc.tag === 'demo' ||
				doc.tag === 'demoonly'
			)
				return Demo(text);
			if (doc.tag === 'see') {
				related.push(doc);
				return [];
			}
			if (doc.tag === 'return')
				return [
					tsx(T, { font: 'headline-small' }, 'Returns'),
					tsx('p', undefined, text),
				];
			if (doc.tag === 'param') return [tsx('p', undefined, text)];

			return [
				doc.tag
					? tsx('p', undefined, `${doc.tag}: `, text)
					: Markdown({ src: text }),
			];
		});

		if (related.length) result.push(DocSee(related));

		return result;
	}

	function renderExtends(node: Summary | string | number) {
		const extendStr: (string | Node)[] = [];
		const type = getTypeSummary(node);
		if (!type || type.kind !== Kind.ClassType) return;

		type.children?.forEach(child => {
			if (typeof child !== 'object') return;
			const entry = getTypeSummary(child);
			if (entry && entry.name !== 'Component')
				extendStr.push(link(entry));
		});
		return tsx(
			T,
			{ font: 'headline-small' },
			' ',
			...(extendStr.length ? [`extends `, extendStr] : []),
		);
	}

	/*function renderImport(node: Summary) {
		const tagName = node.docs?.tagName;
		if (node.kind !== Kind.Component || !tagName) return undefined;
		return (
			<>
				<h2>Importing</h2>
				<CoaxialImporting summary={node}></CoaxialImporting>
			</>
		);
	}*/

	function renderInherited(node: Summary): Child[] {
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
				result.push(
					tsx('br'),
					tsx(T, { font: 'h6' }, 'Inherited from ', link(nodeType)),
					...members,
				);

			result.push(...renderInherited(nodeType));
		}

		return result;
	}

	const tagName = summary.kind === Kind.Component && summary.docs?.tagName;

	return tsx(
		'div',
		{},
		tsx(
			'h1',
			{},
			summary.name,
			' ',
			summary.type && renderExtends(summary.type),
			' ',
			tagName ? tsx(T, { font: 'title-medium' }, `<${tagName}>`) : '',
		),
		...renderDocumentation(summary),
		...Members(summary),
		...renderInherited(summary),
	);
}
