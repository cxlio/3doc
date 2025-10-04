import { Documentation, Node, Kind, Flags, Output } from '../dts/index.js';
import { basename } from 'path';
import { existsSync } from 'fs';

import { escape } from './render.js';

import type { DocGen, File } from './index.js';

declare module '../dts/index.js' {
	interface Node {
		__3docHtmlType?: string;
		__3docSummaryNode?: Summary;
	}
}

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
	tsconfig?: string;
}

const REMOVE = /<\/?[^>]+>/g;
function removeHtml(str: string) {
	return str.replace(REMOVE, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<');
}

function sortByName(a: Summary, b: Summary) {
	return (a.name ?? '') < (b.name ?? '') ? -1 : 1;
}

function hasOwnPage(node: Node) {
	return (
		node.kind === Kind.Class ||
		node.kind === Kind.Interface ||
		node.kind === Kind.Module ||
		node.kind === Kind.Enum ||
		node.kind === Kind.Component ||
		node.kind === Kind.Namespace ||
		(node.kind === Kind.Function &&
			node.flags === Flags.Ambient &&
			node.children?.length)
	);
}

function ClassType(node: Node) {
	const extendStr: string[] = [];
	const implementStr: string[] = [];
	node.children?.forEach(child => {
		const link = Type(child);
		const type = child.type;

		return node.type?.kind === Kind.Interface ||
			(type &&
				(type.kind === Kind.Interface ||
					type.kind === Kind.Class ||
					type.kind === Kind.Component))
			? extendStr.push(link)
			: implementStr.push(link);
	});
	return `<cxl-t h6 inline>${
		(extendStr.length ? `extends ${extendStr.join(', ')}` : '') +
		(implementStr.length ? ` implements ${implementStr.join(', ')}` : '')
	}</cxl-t>`;
}

function ConditionalType(node: Node) {
	if (!node.children) return '';

	const [check, extend, trueVal, falseVal] = node.children;
	return `${Type(check)} extends ${Type(extend)} ? ${Type(trueVal)} : ${Type(
		falseVal,
	)}`;
}

function isReferenceNode(node: Node) {
	return node.kind === Kind.Reference || node.kind === Kind.ImportType;
}

export function getHref(node: Node, parent?: Node): string {
	if (
		node.type &&
		(node.kind === Kind.Reference ||
			node.kind === Kind.Export ||
			node.kind === Kind.ImportType)
	)
		return getHref(node.type);
	if (hasOwnPage(node)) return getPageName(node);

	const parentHref =
		node.parent && (!parent || node.parent.name !== parent.name)
			? getHref(node.parent)
			: '';

	return parentHref + (node.id ? '#s' + node.id.toString() : '');
}

function escapeFileName(name: string, replaceExt = '.html') {
	return name.replace(/\.([tj]sx?|md)$/, replaceExt).replace(/[/"]/g, '--');
}

function getPageName(page: Node) {
	if (page.kind === Kind.Module) {
		const result = escapeFileName(page.name);
		return result === 'index.html' && existsSync('README.md')
			? 'index-api.html'
			: result;
	}

	if (page.kind === Kind.Namespace)
		return `ns--${escapeFileName(page.name)}.html`;

	const source = Array.isArray(page.source) ? page.source[0] : page.source;

	if (!source)
		throw new Error(`Source not found for page node "${page.name}"`);

	const prefix = escapeFileName(source.name, '--');

	return `${prefix}${page.name}.html`;
}

function Link(node: Node, content?: string, parent?: Node): string {
	const name =
		content ||
		(node.name
			? escape(node.name)
			: node.flags & Flags.Default
			? '<i>default</i>'
			: '(Unknown)');

	if (node.type && isReferenceNode(node)) node = node.type;

	if (!node.id) return name;

	const href = getHref(node, parent);

	return `<a href="${href}">${name}</a>`;
}

function TypeArguments(types?: Node[]): string {
	return types
		? '&lt;' +
				types
					.map(
						t =>
							Type(t) +
							(t.kind !== Kind.Reference && t.type
								? ` extends ${Type(t.type)}`
								: ''),
					)
					.join(', ') +
				'&gt;'
		: '';
}

function _renderType(type: Node): string {
	switch (type.kind) {
		case Kind.ClassType:
			return ClassType(type);
		case Kind.Infer:
			return `infer ${Type(type.type)}`;
		case Kind.Parenthesized:
			return `(${Type(type.type)})`;
		case Kind.ConditionalType:
			return ConditionalType(type);
		case Kind.IndexedType:
			if (!type.children) throw new Error('Invalid node');
			return `${Type(type.children[0])}[${Type(type.children[1])}]`;
		/*case Kind.CallSignature:
			if (!type.children) throw new Error('Invalid node');
			return `${Type(type.children[0])}.${Type(type.children[1])}`;*/
		case Kind.TypeUnion:
			return type.children?.map(Type).join(' | ') || '';
		case Kind.TypeIntersection:
			return type.children?.map(Type).join(' & ') || '';
		case Kind.Tuple:
			return `[${type.children?.map(Type).join(', ') || ''}]`;
		case Kind.Array:
			return `${Type(type.type)}[]`;
		case Kind.Reference:
			return `${Link(type)}${TypeArguments(type.typeParameters)}`;
		case Kind.FunctionType:
		case Kind.Function:
		case Kind.Method:
			return FunctionType(type);
		case Kind.MappedType:
			return MappedType(type);
		case Kind.ObjectType:
			return ObjectType(type);
		case Kind.Literal:
			return type.name;
		case Kind.TypeAlias:
		case Kind.BaseType:
			return type.name;
		case Kind.TypeParameter:
			return TypeParameter(type);
		case Kind.ConstructorType:
			return `new ${FunctionType(type)}`;
		case Kind.Keyof:
			return type.resolvedType
				? `<doc-more><x slot="off"> keyof ${Type(type.type)}</x> ${Type(
						type.resolvedType,
				  )}</doc-more>`
				: `keyof ${Type(type.type)}`;
		case Kind.Typeof:
			return `typeof ${type.name}`;
		case Kind.ThisType:
			return 'this';
		case Kind.Class:
		case Kind.Interface:
			return Link(type);
		case Kind.ReadonlyKeyword:
			return `readonly ${Type(type.type)}`;
		case Kind.Symbol:
			return 'Symbol';
		case Kind.UnknownType:
			return 'unknown';
	}
	return Signature(type);
}

function FunctionType(node: Node) {
	const { parameters, typeParameters, type } = node;
	return `${SignatureName(node)}${TypeArguments(
		typeParameters,
	)}${SignatureParameters(parameters)} => ${Type(type)}`;
}

function SignatureName({ flags, kind, name }: Node) {
	if (!name && kind === Kind.ConstructSignature) return 'new';

	return (name ? escape(name) : '') + (flags & Flags.Optional ? '?' : '');
}

function SignatureParameters(parameters?: Node[]) {
	if (!parameters) return '';

	return `(${parameters.map(Parameter).join(', ')})`;
}

function Parameter(p: Node) {
	const modifiers =
		p.flags & Flags.Public
			? 'public '
			: p.flags & Flags.Private
			? 'private'
			: p.flags & Flags.Protected
			? 'protected '
			: '';

	const name = `${modifiers}${p.flags & Flags.Rest ? '...' : ''}${p.name}${
		p.flags & Flags.Optional ? '?' : ''
	}`;
	return `${name}: ${Type(p.type)}${p.value ? ` = ${p.value}` : ''}`;
}

function MappedType(type: Node) {
	if (!type.children?.length || !type.type) return '?';
	const [K, T] = type.children;
	return `{ [${renderType(K)} in ${renderType(T)}]: ${renderType(
		type.type,
	)} }`;
}

function TypeParameter(type: Node) {
	const constraint = type.children?.[0];
	return constraint ? `${type.name} extends ${Type(constraint)}` : type.name;
}

function IndexSignature(node: Node) {
	const params = node.parameters?.map(Signature).join('') || '';
	return `[${params}]: ${node.type ? renderType(node.type) : '?'}`;
}

function SignatureType({ type, kind, name }: Node) {
	if (!type) return '';
	if (
		kind === Kind.Class ||
		kind === Kind.Interface ||
		kind === Kind.Component
	)
		return ` ${Type(type)}`;

	const typeColon = getTypeColon(kind, name);
	return `${typeColon}${Type(type)}`;
}

function getTypeColon(kind: Kind, name: string) {
	if (kind === Kind.TypeAlias) return ' = ';
	if (name || kind === Kind.Constructor) return ': ';
	if (kind === Kind.CallSignature) return ' => ';
	if (kind === Kind.ReadonlyKeyword) return 'readonly ';

	return ' => ';
}

function SignatureValue(val?: string) {
	if (val && val.length > 50) return '';
	return val ? ` = ${escape(val)}` : '';
}

export function SignatureText(node: Node): string {
	if (node.kind === Kind.Module) return escape(node.name);
	if (node.kind === Kind.IndexSignature) return IndexSignature(node);

	const { value, parameters, typeParameters } = node;

	return `${SignatureName(node)}${TypeArguments(
		typeParameters,
	)}${SignatureParameters(parameters)}${SignatureType(node)}${SignatureValue(
		value,
	)}`;
}

function Property(node: Node) {
	if (node.kind === Kind.IndexSignature) return IndexSignature(node);
	if (node.kind === Kind.Spread && node.children?.[0])
		return `...${Type(node.children[0])}`;
	return SignatureText(node);
}

function ObjectType(node: Node) {
	const result = `${node.children?.map(Property).join('; ') || ''}`;
	return `{ ${result} }`;
}

function renderTypeString(type: Node): string {
	return (type.__3docHtmlType ??= _renderType(type));
}

export function Type(type?: Node): string {
	if (!type) return '';
	const flags = type.flags & Flags.Rest ? '...' : '';
	return `${flags}${renderTypeString(type)}`;
}

export function Signature(node: Node): string {
	if (node.kind === Kind.Module || node.kind === Kind.IndexSignature)
		return SignatureText(node);

	return `${SignatureText(node)}`;
}

function renderType(node: Node): string | Summary {
	if (node.kind === Kind.Reference && node.type) node = node.type;

	if (node.kind === Kind.ClassType) {
		const children: Summary[] = [];
		node.children?.forEach(child => {
			if (child.kind !== Kind.Reference) return;
			children.push({
				kind: Kind.Reference,
				type: child.type?.id,
			});
		});
		return {
			kind: node.kind,
			children,
			type: node.type?.id,
		};
	}

	if (node.kind === Kind.BaseType) return node.name;
	if (
		node.flags & Flags.External ||
		node.flags & Flags.DefaultLibrary ||
		(node.kind !== Kind.ObjectType &&
			node.kind !== Kind.FunctionType &&
			node.kind !== Kind.Function &&
			node.kind !== Kind.Method &&
			node.kind !== Kind.TypeUnion &&
			node.kind !== Kind.Interface)
	)
		return removeHtml(Type(node));

	const typeP = node.typeParameters?.length
		? node.typeParameters.map(renderTypeParam)
		: undefined;

	const parameters = node.parameters?.length
		? node.parameters.map(renderNode)
		: undefined;

	return {
		id: node.id,
		name: node.name || undefined,
		parameters,
		kind: node.kind,
		flags: node.flags || undefined,
		docs: node.docs,
		type: node.type?.id,
		typeP,
		tsconfig:
			node.flags & Flags.Export && node.source?.tsconfig
				? basename(node.source?.tsconfig)
				: undefined,
	};
}

function renderTypeParam(node: Node): Summary {
	const constraintType = node
		? node.kind === Kind.Reference &&
		  node.type?.id !== undefined &&
		  node.type.flags & Flags.Export
			? node.type.id
			: renderType(node)
		: undefined;

	return {
		id: node.id,
		name: node.name,
		kind: node.kind,
		flags: node.flags || undefined,
		docs: node.docs,
		type: constraintType,
	};
}

function renderNode(node: Node): Summary {
	if (node.__3docSummaryNode) return node.__3docSummaryNode;

	const children = node.children?.length
		? node.children.map(renderNode).sort(sortByName)
		: undefined;
	const parameters = node.parameters?.length
		? node.parameters.map(renderNode)
		: undefined;
	const typeP = node.typeParameters?.length
		? node.typeParameters.map(renderTypeParam)
		: undefined;
	const typeN = node.type;
	let type: string | number | Summary | undefined;

	if (typeN) {
		if (
			typeN.kind === Kind.Reference &&
			typeN.type?.id !== undefined &&
			typeN.type.flags &&
			typeN.type.flags & Flags.Export
		) {
			type = typeN.type.id;
		} else {
			type = renderType(typeN);
		}
	}

	const resolvedType = node.resolvedType
		? node.resolvedType?.type?.type === node
			? node.resolvedType.name
			: renderType(node.resolvedType)
		: undefined;

	return (node.__3docSummaryNode = {
		id: node.id,
		name: node.name || undefined,
		parameters,
		kind: node.kind,
		flags: node.flags || undefined,
		docs: node.docs,
		type,
		typeP,
		resolvedType: resolvedType === type ? undefined : resolvedType,
		children,
		tsconfig:
			node.flags & Flags.Export && node.source?.tsconfig
				? basename(node.source?.tsconfig)
				: undefined,
	});
}

function nodeFilter(p: Node) {
	return hasOwnPage(p) || p.kind === Kind.TypeAlias;
}

export function render(app: DocGen, output: Output): File[] {
	const index = Object.values(output.index)
		.filter(nodeFilter)
		.map<Summary>(renderNode)
		.sort(sortByName);

	const version = app.modulePackage?.version;

	return [
		{
			name: version ? `${version}/summary.json` : 'summary.json',
			content: JSON.stringify({
				index,
			}),
		},
	];
}
