import { relative, resolve } from 'path';
import * as tsLocal from 'typescript';

import { Kind, Flags } from './enum.js';

import type * as ts from 'typescript';

const { getParsedCommandLineOfConfigFile, NodeFlags, sys } = tsLocal;

const SK = tsLocal.SyntaxKind;
const TF = tsLocal.TypeFlags;

export { Kind, Flags } from './enum.js';

type dtsNode = Node;

declare module 'typescript' {
	interface Node {
		[dtsNode]?: dtsNode;
		$$internal?: boolean;
		$$resolvedType?: boolean;
		jsDoc?: ts.JSDoc[];
		name?: ts.Node;
	}

	interface Type {
		$$resolvedType?: boolean;
	}

	interface Symbol {
		[dtsNode]?: dtsNode;
		$$moduleResult?: dtsNode;
		$$fqn?: string;
		parent?: ts.Symbol;
	}

	interface SourceFile {
		moduleName?: string;
		originalFileName?: string;
		path?: string;
	}

	interface CompilerOptions {
		configFilePath?: string;
	}
}

type SerializerMap = {
	/* eslint-disable-next-line */
	[K in ts.SyntaxKind]?: (node: any) => Node;
};

type Index = Record<number, Node>;

export interface BuildOptions {
	customJsDocTags?: string[];
	rootDir: string | undefined;
	exportsOnly: boolean;
	cxlExtensions: boolean;
	forceExports?: string[];
	followReferences?: boolean;
	debug?: boolean;
}

export interface ParseOptions extends Partial<BuildOptions> {
	compilerOptions?: ts.CompilerOptions;
	fileName?: string;
	source: string;
}

const SyntaxKindMap: Record<number, Kind> = {
	[SK.Unknown]: Kind.Unknown,
	[SK.VariableDeclaration]: Kind.Variable,
	[SK.TypeAliasDeclaration]: Kind.TypeAlias,
	[SK.TypeParameter]: Kind.TypeParameter,
	[SK.InterfaceDeclaration]: Kind.Interface,
	[SK.UnionType]: Kind.TypeUnion,
	[SK.TypeReference]: Kind.Reference,
	[SK.SourceFile]: Kind.Module,
	[SK.ClassDeclaration]: Kind.Class,
	[SK.Parameter]: Kind.Parameter,
	[SK.PropertyDeclaration]: Kind.Property,
	[SK.MethodDeclaration]: Kind.Method,
	[SK.GetAccessor]: Kind.Getter,
	[SK.SetAccessor]: Kind.Setter,
	[SK.Constructor]: Kind.Constructor,
	[SK.ArrayType]: Kind.Array,
	[SK.FunctionDeclaration]: Kind.Function,
	[SK.FunctionType]: Kind.FunctionType,
	[SK.ConditionalType]: Kind.ConditionalType,
	[SK.ParenthesizedType]: Kind.Parenthesized,
	[SK.InferType]: Kind.Infer,
	[SK.IndexedAccessType]: Kind.IndexedType,
	[SK.EnumDeclaration]: Kind.Enum,
	[SK.LiteralType]: Kind.Literal,
	[SK.TemplateLiteralType]: Kind.Literal,
	[SK.IndexSignature]: Kind.IndexSignature,
	[SK.ExportSpecifier]: Kind.Export,
	[SK.KeyOfKeyword]: Kind.Keyof,
	[SK.TypeQuery]: Kind.Typeof,
	[SK.ConstructorType]: Kind.ConstructorType,
	[SK.TupleType]: Kind.Tuple,
	[SK.ThisType]: Kind.ThisType,
	[SK.ModuleDeclaration]: Kind.Namespace,
	[SK.CallSignature]: Kind.CallSignature,
	[SK.ConstructSignature]: Kind.ConstructSignature,
	[SK.MappedType]: Kind.MappedType,
	[SK.IntersectionType]: Kind.TypeIntersection,
	[SK.ReadonlyKeyword]: Kind.ReadonlyKeyword,
	[SK.UnknownKeyword]: Kind.UnknownType,
	[SK.SpreadAssignment]: Kind.Spread,
	[SK.ImportType]: Kind.ImportType,
	[SK.SymbolKeyword]: Kind.Symbol,
};

export interface DocumentationContent {
	tag?: string;
	value: string | { tag?: string; value: string }[];
}

export interface Documentation {
	decorator?: boolean;
	content?: DocumentationContent[];
	tagName?: string;
	role?: string;
	beta?: boolean;
	alpha?: boolean;
}

export interface Source {
	name: string;
	index: number;
	node: ts.Node;
	sourceFile?: ts.SourceFile;
	tsconfig?: string;
}

export interface Node {
	id?: number;
	name: string;
	kind: Kind;
	source?: Source; // | Source[];
	flags: Flags;
	docs?: Documentation;
	value?: string;
	type?: Node;
	resolvedType?: Node;
	typeParameters?: Node[];
	parameters?: Node[];
	children?: Node[];
	extendedBy?: Node[];
	parent?: Node;
}

export interface Output {
	index: Index;
	config: ts.ParsedCommandLine;
	modules: Node[];
	env: { typescript: string };
}

export const defaultOptions: BuildOptions = {
	exportsOnly: true,
	rootDir: undefined,
	cxlExtensions: false,
};

export const NumberType: Node = createBaseType('number'),
	StringType: Node = createBaseType('string'),
	BooleanType: Node = createBaseType('boolean'),
	UndefinedType: Node = createBaseType('undefined'),
	NullType: Node = createBaseType('null'),
	VoidType: Node = createBaseType('void'),
	AnyType: Node = createBaseType('any'),
	UnknownType: Node = createBaseType('unknown'),
	BigIntType: Node = createBaseType('BigInt'),
	NeverType: Node = createBaseType('never');

const dtsNode: symbol = Symbol('dtsNode');

const printer = tsLocal.createPrinter({
	removeComments: true,
	newLine: tsLocal.NewLineKind.LineFeed,
	omitTrailingSemicolon: true,
});

let currentIndex: Index;
let program: ts.Program;
let config: ts.ParsedCommandLine | undefined;
let sourceFiles: readonly ts.SourceFile[];
let typeChecker: ts.TypeChecker;
let currentId = 1;
let extraModules: Node[] | undefined;
let exportIndex: Record<string, Node> | undefined;
let currentOptions: BuildOptions | undefined;
let moduleMap: Record<string, Node> | undefined;
let builtReferences: string[] | undefined;

const parseConfigHost: ts.FormatDiagnosticsHost & ts.ParseConfigFileHost = {
	useCaseSensitiveFileNames: true,
	readDirectory: sys.readDirectory,
	getCurrentDirectory() {
		return config?.options.rootDir ?? sys.getCurrentDirectory();
	},
	getNewLine: () => '\n',
	fileExists: sys.fileExists,
	getCanonicalFileName: f => f,
	readFile: sys.readFile,
	onUnRecoverableConfigFileDiagnostic(e) {
		const msg = tsLocal.formatDiagnosticsWithColorAndContext(
			[e],
			parseConfigHost,
		);
		throw new Error(msg);
	},
};

type PrintableNode = {
	id?: number;
	source?: string | string[];
	name: string;
	flags: string[];
	kind: string;
	docs?: Documentation;
	value?: string;
	type?: PrintableNode;
	typeParameters?: PrintableNode[];
	parameters?: PrintableNode[];
	children?: PrintableNode[];
	extendedBy?: PrintableNode[];
	parent?: PrintableNode;
};

function flags(flags: number, all: Record<number, string>) {
	const result = [];
	for (const i in all) if (flags & +i) result.push(all[i]);
	return result;
}

export function typeFlags(node: ts.Type): (string | undefined)[] {
	return flags(node.flags, tsLocal.TypeFlags);
}

function _printNode(node: Node, visited: Node[] = []): PrintableNode {
	const {
		typeParameters,
		type,
		value,
		parameters,
		docs,
		source,
		id,
		kind,
		name,
		children,
		extendedBy,
		flags,
	} = node;
	const flagText: string[] = [];
	if (flags)
		for (const i in Flags) if (flags & +(Flags[i] ?? 0)) flagText.push(i);

	if (visited.includes(node))
		return { name: `circular: ${name}`, flags: flagText, kind: Kind[kind] };
	visited.push(node);

	const sources = source?.name || '?';

	return {
		id,
		name,
		kind: Kind[kind],
		source: sources,
		docs,
		value,
		flags: flagText,
		type: type && _printNode(type, visited),
		typeParameters: typeParameters?.map(n => _printNode(n, visited)),
		parameters: parameters?.map(n => _printNode(n, visited)),
		children: children?.map(n => _printNode(n, visited)),
		extendedBy: extendedBy?.map(n => _printNode(n, visited)),
	};
}

export function printNode(node: Node): void {
	console.log(JSON.stringify(_printNode(node), null, 2));
}

function getTypeNode(node: ts.Node) {
	const type = typeChecker.getTypeAtLocation(node);
	return typeChecker.typeToTypeNode(
		type,
		node,
		tsLocal.NodeBuilderFlags.NoTruncation |
			tsLocal.NodeBuilderFlags.IgnoreErrors,
	);
}
function getReturnTypeNode(fn: ts.FunctionLikeDeclaration) {
	const signature = typeChecker.getSignatureFromDeclaration(fn);
	if (!signature) {
		return tsLocal.factory.createKeywordTypeNode(SK.AnyKeyword);
	}

	const returnType = typeChecker.getReturnTypeOfSignature(signature);

	return typeChecker.typeToTypeNode(
		returnType,
		fn,
		tsLocal.NodeBuilderFlags.NoTruncation |
			tsLocal.NodeBuilderFlags.WriteTypeArgumentsOfSignature |
			tsLocal.NodeBuilderFlags.UseOnlyExternalAliasing |
			tsLocal.NodeBuilderFlags.IgnoreErrors,
	);
}

export function printSignature(fn: Node): string {
	let tsNode = fn.source?.node;
	const sf = fn.source?.sourceFile;

	if (!tsNode || !sf) return '';

	if (tsLocal.isFunctionDeclaration(tsNode)) {
		/*const sig = typeChecker.getSignatureFromDeclaration(tsNode);
		if (sig)
			return typeChecker.signatureToString(
				sig,
				tsNode,
				tsLocal.TypeFormatFlags.NoTruncation |
					tsLocal.TypeFormatFlags.MultilineObjectLiterals |
					tsLocal.TypeFormatFlags.UseStructuralFallback |
					tsLocal.TypeFormatFlags.IgnoreErrors,
			);*/
		tsNode = tsLocal.factory.updateFunctionDeclaration(
			tsNode,
			tsNode.modifiers,
			tsNode.asteriskToken,
			tsNode.name,
			tsNode.typeParameters,
			tsNode.parameters,
			tsNode.type ?? getReturnTypeNode(tsNode),
			undefined,
		);
	} else if (tsLocal.isConstructorDeclaration(tsNode))
		tsNode = tsLocal.factory.updateConstructorDeclaration(
			tsNode,
			tsNode.modifiers,
			tsNode.parameters,
			undefined,
		);
	else if (tsLocal.isMethodDeclaration(tsNode))
		tsNode = tsLocal.factory.updateMethodDeclaration(
			tsNode,
			tsNode.modifiers,
			tsNode.asteriskToken,
			tsNode.name,
			tsNode.questionToken,
			tsNode.typeParameters,
			tsNode.parameters,
			tsNode.type ?? getReturnTypeNode(tsNode),
			undefined,
		);
	/*else if (tsLocal.isMethodSignature(tsNode))
		tsNode = tsLocal.factory.updateMethodSignature(
			tsNode,
			tsNode.modifiers,
			tsNode.name,
			tsNode.questionToken,
			tsNode.typeParameters,
			tsNode.parameters,
			tsNode.type,
		);
	else if (tsLocal.isCallSignatureDeclaration(tsNode))
		tsNode = tsLocal.factory.updateCallSignature(
			tsNode,
			tsNode.typeParameters,
			tsNode.parameters,
			tsNode.type,
		);
	else if (tsLocal.isConstructSignatureDeclaration(tsNode))
		tsNode = tsLocal.factory.updateConstructSignature(
			tsNode,
			tsNode.typeParameters,
			tsNode.parameters,
			tsNode.type,
		);*/ else if (tsLocal.isGetAccessorDeclaration(tsNode))
		tsNode = tsLocal.factory.updateGetAccessorDeclaration(
			tsNode,
			tsNode.modifiers,
			tsNode.name,
			tsNode.parameters,
			tsNode.type ?? getReturnTypeNode(tsNode),
			undefined,
		);
	else if (tsLocal.isSetAccessorDeclaration(tsNode))
		tsNode = tsLocal.factory.updateSetAccessorDeclaration(
			tsNode,
			tsNode.modifiers,
			tsNode.name,
			tsNode.parameters,
			undefined,
		);
	/*else if (tsLocal.isFunctionExpression(tsNode))
		tsNode = tsLocal.factory.updateFunctionExpression(
			tsNode,
			tsNode.modifiers,
			tsNode.asteriskToken,
			tsNode.name,
			tsNode.typeParameters,
			tsNode.parameters,
			tsNode.type,
			undefined,
		);*/ else if (tsLocal.isArrowFunction(tsNode))
		tsNode = tsLocal.factory.updateArrowFunction(
			tsNode,
			tsNode.modifiers,
			tsNode.typeParameters,
			tsNode.parameters,
			tsNode.type ?? getReturnTypeNode(tsNode),
			tsNode.equalsGreaterThanToken,
			tsLocal.factory.createBlock([], true),
		);
	else if (tsLocal.isPropertyDeclaration(tsNode))
		tsNode = tsLocal.factory.updatePropertyDeclaration(
			tsNode,
			tsNode.modifiers,
			tsNode.name,
			tsNode.questionToken ?? tsNode.exclamationToken,
			tsNode.type ?? getTypeNode(tsNode),
			undefined, // remove initializer
		);
	else if (tsLocal.isPropertySignature(tsNode))
		tsNode = tsLocal.factory.updatePropertySignature(
			tsNode,
			tsNode.modifiers,
			tsNode.name,
			tsNode.questionToken,
			tsNode.type ?? getTypeNode(tsNode),
		);
	else if (tsLocal.isVariableDeclaration(tsNode))
		tsNode = tsLocal.factory.updateVariableDeclaration(
			tsNode,
			tsNode.name,
			tsNode.exclamationToken,
			tsNode.type ?? getTypeNode(tsNode),
			undefined, // remove initializer
		);

	return printer.printNode(tsLocal.EmitHint.Unspecified, tsNode, sf);
}

export function print(node: Node): string {
	return node.source?.sourceFile
		? printer.printNode(
				tsLocal.EmitHint.Unspecified,
				node.source.node,
				node.source.sourceFile,
			)
		: '';
}

export function printTsNode(node: ts.Node): void {
	function print(node: ts.Node) {
		const flagText: string[] = [];
		if (node.flags)
			for (const i in NodeFlags)
				if (node.flags & +(NodeFlags[i] ?? 0)) flagText.push(i);
		return {
			...node,
			parent: undefined,
			flagText,
			kind: SK[node.kind],
		};
	}

	console.log(print(node));
}

function createBaseType(name: string): Node {
	return { name, kind: Kind.BaseType, flags: 0 };
}

function parseTsConfig(tsconfig: string, options?: BuildOptions) {
	let parsed: ts.ParsedCommandLine | undefined;
	try {
		parsed = getParsedCommandLineOfConfigFile(
			tsconfig,
			{
				rootDir: options?.rootDir
					? resolve(options.rootDir)
					: undefined,
			},
			parseConfigHost,
		);
	} catch (e) {
		if (e instanceof Error) throw e;
		const msg = typeof e === 'string' ? e : String(e);
		throw new Error(msg);
	}

	if (!parsed) throw new Error(`Could not parse config file "${tsconfig}"`);
	return parsed;
}

function getKind(node: ts.Node): Kind {
	switch (node.kind) {
		case SK.BindingElement:
			return node.parent.parent.parent.flags & NodeFlags.Const
				? Kind.Constant
				: Kind.Variable;
		case SK.VariableDeclaration:
			return node.parent.flags & NodeFlags.Const
				? Kind.Constant
				: Kind.Variable;
		case SK.TypeLiteral:
		case SK.ObjectLiteralExpression:
			return Kind.ObjectType;
		case SK.PropertySignature:
		case SK.PropertyAssignment:
		case SK.EnumMember:
			return Kind.Property;
		default:
			return SyntaxKindMap[node.kind] || Kind.Unknown;
	}
}

function createNodeId(_tsNode: ts.Node, _node?: Node) {
	return currentId++;
}

function getNodeSourceFile(node: ts.Node) {
	return node.flags & NodeFlags.Synthesized ? undefined : node.getSourceFile();
}

function getNodeSource(node: ts.Node): Source | undefined {
	const root = currentOptions?.rootDir || process.cwd();
	const sourceFile = getNodeSourceFile(node);
	if (!sourceFile) return;
	const result = {
		name: relative(root, sourceFile.fileName),
		index: node.pos,
		node,
		tsconfig: program.getCompilerOptions().configFilePath,
	};
	Object.defineProperty(result, 'sourceFile', {
		value: sourceFile,
		enumerable: false,
	});
	return result;
}

function getNodeName(node: ts.Node): string {
	if (tsLocal.isSourceFile(node)) {
		return normalizeSourceFileName(node.fileName);
	}
	if (tsLocal.isTypeReferenceNode(node)) node = node.typeName;
	else if (node.name) node = node.name;

	if (tsLocal.isIdentifier(node)) return node.text;

	if (node.pos !== -1 && tsLocal.isStringLiteral(node)) return node.getText();

	if (
		tsLocal.isTemplateLiteralTypeNode(node) ||
		tsLocal.isLiteralTypeNode(node) ||
		tsLocal.isLiteralExpression(node)
	) {
		return printer.printNode(
			tsLocal.EmitHint.Unspecified,
			node,
			node.getSourceFile(),
		);
	}

	if (tsLocal.isStringLiteral(node)) return node.text;

	if (tsLocal.isComputedPropertyName(node) || tsLocal.isQualifiedName(node))
		return node.pos === -1 ? '' : node.getText();

	return tsLocal.isSourceFile(node) ? node.moduleName || '' : '';
}

function createNode(node: ts.Node, extra?: Partial<Node>): Node {
	const result: Node = node[dtsNode] || {
		name: '',
		kind: extra?.kind ?? getKind(node),
		flags: getFlags(node),
	};

	result.source ??= getNodeSource(node);
	if (extra?.kind !== undefined) result.kind = extra.kind;
	result.name ||= extra?.name || getNodeName(node);

	const docs = getNodeDocs(node, result);
	if (docs) result.docs = docs;

	if (extra) Object.assign(result, extra);

	return (node[dtsNode] = result);
}

function getNodeFromDeclaration(symbol: ts.Symbol, node: ts.Node): Node {
	const result = node[dtsNode];
	if (!result) {
		const sourceFile = node.getSourceFile();
		if (
			!program.isSourceFileDefaultLibrary(sourceFile) &&
			!program.isSourceFileFromExternalLibrary(sourceFile) &&
			sourceFile.isDeclarationFile
		) {
			const fqn = getSymbolFullyQualifiedName(symbol);
			const externalNode = exportIndex?.[fqn];
			if (externalNode?.source) return externalNode;
		}

		return createNode(node);
	}
	result.id ??= createNodeId(node);

	return result;
}

function isClassMember(
	node: ts.Node,
): node is
	| ts.PropertyDeclaration
	| ts.MethodDeclaration
	| ts.GetAccessorDeclaration
	| ts.SetAccessorDeclaration
	| ts.PropertySignature
	| ts.MethodSignature {
	return (
		node.kind === SK.PropertyDeclaration ||
		node.kind === SK.MethodDeclaration ||
		node.kind === SK.GetAccessor ||
		node.kind === SK.SetAccessor ||
		node.kind === SK.PropertySignature ||
		node.kind === SK.MethodSignature
	);
}

function serialize(node: ts.Node) {
	return (Serializer[node.kind] || createNode)(node);
}

function serializeExpression(node: ts.Expression) {
	return node.getText();
}

function hasInternalAnnotation(node: ts.Node, text: string) {
	if (node.kind === SK.ModuleDeclaration) return false;
	for (let parent = node; ; parent = parent.parent) {
		if (parent.$$internal) return true;
		if (parent.$$internal !== false) {
			const ranges = tsLocal.getLeadingCommentRanges(text, parent.pos);
			if (ranges)
				for (const r of ranges) {
					const rangeText = text.substring(r.pos, r.end);
					if (rangeText.indexOf('@internal') !== -1) {
						return (parent.$$internal = true);
					}
				}
			}
		if (tsLocal.isSourceFile(parent)) break;
	}

	return (node.$$internal = false);
}

function getDeclarationFlags(node: ts.Declaration, flags: ts.ModifierFlags) {
	const tsFlags = tsLocal.ModifierFlags;
	const sourceFile = getNodeSourceFile(node);
	const isDecl = sourceFile?.isDeclarationFile;
	let result = 0;

	if (flags & tsFlags.Export || isDecl || node.kind === SK.NamespaceExport)
		result |= Flags.Export;
	if (flags & tsFlags.Ambient) result |= Flags.Ambient;
	if (flags & tsFlags.Public) result |= Flags.Public;
	if (flags & tsFlags.Private) result |= Flags.Private;
	if (flags & tsFlags.Protected) result |= Flags.Protected;
	if (flags & tsFlags.Static) result |= Flags.Static;
	if (flags & tsFlags.Readonly) result |= Flags.Readonly;
	if (flags & tsFlags.Abstract) result |= Flags.Abstract;
	if (flags & tsFlags.Async) result |= Flags.Async;
	if (flags & tsFlags.Default) result |= Flags.Default;
	if (flags & tsFlags.Deprecated) result |= Flags.Deprecated;

	if (isClassMember(node)) {
		if (tsLocal.isPrivateIdentifier(node.name)) result |= Flags.Private;
		else if (!(result & (Flags.Private | Flags.Protected)))
			result |= Flags.Public;
	}

	return result;
}

function getFlags(node: ts.Node) {
	let result = 0;

	if (
		(tsLocal.isParameter(node) ||
			tsLocal.isPropertyDeclaration(node) ||
			tsLocal.isPropertySignature(node) ||
			tsLocal.isMethodDeclaration(node) ||
			tsLocal.isMethodSignature(node)) &&
		node.questionToken
	)
		result |= Flags.Optional;

	const sourceFile = tsLocal.isSourceFile(node) ? node : getNodeSourceFile(node);

	if (sourceFile) {
		if (hasInternalAnnotation(node, sourceFile.getFullText()))
			result |= Flags.Internal;
		if (program.isSourceFileDefaultLibrary(sourceFile))
			result |= Flags.DefaultLibrary;
		if (program.isSourceFileFromExternalLibrary(sourceFile))
			result |= Flags.External;
	}

	return result;
}

function getResolvedType(type: ts.Type) {
	if (type.$$resolvedType) return;

	const widened = typeChecker.getWidenedType(type);

	if (widened === type) {
		const callable = serializeAnonymousCallableType(widened);
		if (callable) return callable;
		try {
			const resolved = typeChecker.typeToTypeNode(
				widened,
				undefined,
				tsLocal.NodeBuilderFlags.NoTypeReduction |
					tsLocal.NodeBuilderFlags.InTypeAlias |
					tsLocal.NodeBuilderFlags.NoTruncation |
					tsLocal.NodeBuilderFlags.IgnoreErrors,
			);
			if (resolved) resolved.$$resolvedType = true;
			return resolved ? serialize(resolved) : undefined;
		} catch (e) {
			console.error(e);
			return undefined;
		}
	} else widened.$$resolvedType = true;

	return serializeType(widened);
}

const comments = /<!--(.*?)-->/g;
function processJsDoc(content: string) {
	return content.trim().replace(comments, '');
}

function parseJsDocComment(comment: ts.JSDoc['comment']) {
	if (!comment) return;
	if (typeof comment === 'string') return processJsDoc(comment);

	return comment.map(n =>
		n.kind === SK.JSDocLink
			? {
					tag: 'link',
					value: `${n.name?.getText() || ''}${n.text.trim()}`,
				}
			: { value: processJsDoc(n.text) },
	);
}

function getJsDocText(doc: ts.JSDocTag | ts.JSDocComment): string {
	return doc
		.getText()
		.split('\n')
		.map(line => {
			const trimmed = line.trimStart();
			return trimmed.startsWith('* ') ? trimmed.slice(2) : line;
		})
		.join('\n');
}

function mergeJsDocComment(content: DocumentationContent[], doc: ts.JSDocTag) {
	// Get whitespace after tag
	const newContent = `\n${getJsDocText(doc)}`;
	const existing = content[content.length - 1];

	if (existing) {
		const old = existing.value || '';
		if (typeof old === 'string') existing.value = old + newContent;
		else old.push({ value: newContent });
	} else content.push({ value: newContent });
}

function isInvalidJsDocTag(
	doc: ts.JSDocTag,
	tag: string | undefined,
	content: DocumentationContent[],
) {
	return Boolean(
		doc.comment &&
		tag &&
		!currentOptions?.customJsDocTags?.includes(tag) &&
		tag !== tag.toLowerCase() &&
		content.length > 0,
	);
}

function applyJsDocMetadata(
	result: Node,
	docs: Documentation,
	tag: string | undefined,
) {
	if (tag === 'deprecated') result.flags |= Flags.Deprecated;
	if (tag === 'beta') docs.beta = true;
	if (tag === 'alpha') docs.alpha = true;
	if (!currentOptions?.cxlExtensions) return;
	if (tag === 'attribute') result.kind = Kind.Attribute;
	else if (tag === 'event') result.kind = Kind.Event;
}

function processJsDocTag(
	node: ts.Node,
	result: Node,
	docs: Documentation,
	content: DocumentationContent[],
	doc: ts.JSDocTag,
) {
	const tag = doc.tagName.text === 'description' ? undefined : doc.tagName.text;
	const name = tsLocal.isJSDocSeeTag(doc) ? doc.name?.getText() : undefined;
	let value = doc.comment ? parseJsDocComment(doc.comment) : name;
	if (currentOptions?.cxlExtensions && tag === 'tagName') {
		docs.tagName = String(value);
		return;
	}
	if (isInvalidJsDocTag(doc, tag, content)) {
		mergeJsDocComment(content, doc);
		return;
	}
	applyJsDocMetadata(result, docs, tag);
	if (tag === 'see' && doc.comment === '*') value = name;

	if (value && !(tag === 'param' && node.kind !== SK.Parameter))
		content.push({
			tag: tag === 'desc' || tag === 'description' ? undefined : tag,
			value,
		});
}

function getNodeDocs(
	node: ts.Node,
	result: Node,
	jsDoc: readonly ts.JSDoc[] | undefined = node.jsDoc,
) {
	const content: DocumentationContent[] = [];
	const docs: Documentation = { content };

	jsDoc?.forEach(doc => {
		const value = parseJsDocComment(doc.comment);
		if (value) content.push({ value });
	});
	tsLocal
		.getJSDocTags(node)
		.forEach(doc => processJsDocTag(node, result, docs, content, doc));

	return content.length ? docs : undefined;
}

function serializeDeclaration(node: ts.Declaration): Node {
	const result = createNode(node);
	if (result.id === undefined) {
		result.id = createNodeId(node, result);
	}
	result.flags |= getDeclarationFlags(
		node,
		tsLocal.getCombinedModifierFlags(node),
	);

	const id = result.id;

	const typeParameters =
		tsLocal.isClassLike(node) ||
		tsLocal.isInterfaceDeclaration(node) ||
		tsLocal.isTypeAliasDeclaration(node) ||
		tsLocal.isFunctionLike(node)
			? node.typeParameters
			: undefined;
	if (typeParameters) result.typeParameters = typeParameters.map(serialize);

	if (tsLocal.isEnumMember(node))
		result.value = JSON.stringify(typeChecker.getConstantValue(node));
	else {
		const initializer = getInitializer(node);
		if (initializer) result.value = serializeExpression(initializer);
	}

	if (id) currentIndex[id] = result;

	return result;
}

function getInitializer(node: ts.Declaration) {
	if (
		tsLocal.isVariableDeclaration(node) ||
		tsLocal.isParameter(node) ||
		tsLocal.isPropertyDeclaration(node) ||
		tsLocal.isPropertyAssignment(node) ||
		tsLocal.isBindingElement(node)
	)
		return node.initializer;
}

function serializeTypeParameter(node: ts.TypeParameterDeclaration) {
	const result = serializeDeclaration(node);
	if (node.default) result.value = node.default.getText();
	if (node.constraint) result.children = [serialize(node.constraint)];
	return result;
}

function serializeUnknownSymbol(symbol: ts.Symbol): Node {
	const result = {
		name: symbol.name,
		kind: Kind.Unknown,
		flags: 0,
	};
	return result;
}

function serializeParameter(symbol: ts.Symbol) {
	const node = symbol.valueDeclaration;

	if (!node || !tsLocal.isParameter(node)) return serializeUnknownSymbol(symbol);

	const result = serializeDeclarationWithType(node);
	if (!result.name) result.name = node.name.getText();

	if (result.flags & (Flags.Private | Flags.Public | Flags.Protected))
		result.kind = Kind.Property;

	if (node.dotDotDotToken) result.flags = result.flags | Flags.Rest;
	if (node.questionToken) result.flags = result.flags | Flags.Optional;

	return result;
}

function getSymbolReference(
	symbol: ts.Symbol,
	typeArgs?: readonly ts.Type[],
): Node {
	const node = symbol.declarations?.[0] || symbol.valueDeclaration;
	const name =
		symbol.flags & tsLocal.SymbolFlags.Namespace ||
		node?.kind === SK.EnumMember
			? normalizeModuleName(symbol)
			: symbol.getName();

	if (!node) {
		return {
			name,
			flags: 0,
			kind: Kind.Reference,
			typeParameters: typeArgs?.length
				? typeArgs.map(serializeType)
				: undefined,
		};
	}

	return {
		name,
		flags: 0,
		kind: Kind.Reference,
		type: getNodeFromDeclaration(symbol, node),
		typeParameters: typeArgs?.length
			? typeArgs.map(serializeType)
			: undefined,
	};
}

function isReferenceType(type: ts.Type) {
	return (
		type.flags & TF.Enum ||
		type.flags & TF.EnumLiteral ||
		type.flags & TF.UniqueESSymbol ||
		type.isClassOrInterface() ||
		type.isTypeParameter() ||
		isTypeReference(type)
	);
}

function isIndexType(type: ts.Type): type is ts.IndexType {
	return Boolean(type.flags & TF.Index);
}

function isIndexedAccessType(type: ts.Type): type is ts.IndexedAccessType {
	return Boolean(type.flags & TF.IndexedAccess);
}

function isObjectType(type: ts.Type): type is ts.ObjectType {
	return Boolean(type.flags & TF.Object);
}

function isTypeReference(type: ts.Type): type is ts.TypeReference {
	return (
		isObjectType(type) &&
		Boolean(type.objectFlags & tsLocal.ObjectFlags.Reference)
	);
}

function serializeIndexedAccessType(type: ts.IndexedAccessType): Node {
	return {
		name: '',
		kind: Kind.IndexedType,
		flags: 0,
		children: [
			serializeType(type.objectType),
			serializeType(type.indexType),
		],
	};
}

function getSymbolDeclaration(symbol?: ts.Symbol) {
	return symbol && (symbol.declarations?.[0] || symbol.valueDeclaration);
}

function serializeSymbol(symbol: ts.Symbol): Node {
	const tsNode = getSymbolDeclaration(symbol);
	const node = tsNode
		? serialize(tsNode)
		: {
				name: symbol.name,
				kind: Kind.Unknown,
				flags: 0,
			};
	if (node.kind !== Kind.Namespace) node.name = symbol.name;
	return node;
}

function serializeKeyofType(type: ts.IndexType): Node {
	return {
		name: typeChecker.typeToString(type),
		kind: Kind.Keyof,
		type: serializeType(type.type),
		resolvedType: getResolvedType(type),
		flags: 0,
	};
}

function serializeLiteralType(type: ts.Type, baseType: ts.Type): Node {
	return {
		name: typeChecker.typeToString(type),
		kind: Kind.Literal,
		type: baseType !== type ? serializeType(baseType) : undefined,
		flags: 0,
	};
}

function serializeTypeObject(
	type: ts.ObjectType,
	callSignatures = typeChecker.getSignaturesOfType(
		type,
		tsLocal.SignatureKind.Call,
	),
): Node {
	const typeNode = typeChecker.typeToTypeNode(
		type,
		undefined,
		tsLocal.NodeBuilderFlags.InObjectTypeLiteral |
			tsLocal.NodeBuilderFlags.NoTruncation |
			tsLocal.NodeBuilderFlags.IgnoreErrors,
	);
	if (!typeNode) {
		return {
			name: typeChecker.typeToString(type),
			kind: Kind.ObjectType,
			flags: 0,
		};
	}

	const result = serialize(typeNode);
	const properties = new Map(
		typeChecker
			.getPropertiesOfType(type)
			.map(symbol => [symbol.name, symbol]),
	);
	let callIndex = 0;

	result.children?.forEach(child => {
		if (child.kind === Kind.CallSignature) {
			applySignatureDeclaration(child, callSignatures[callIndex++]);
			return;
		}

		const symbol = properties.get(child.name);
		const declaration = getSymbolDeclaration(symbol);
		if (!symbol || !declaration) return;
		const propertyType = typeChecker.getTypeOfSymbolAtLocation(
			symbol,
			declaration,
		);
		const signatures = typeChecker.getSignaturesOfType(
			propertyType,
			tsLocal.SignatureKind.Call,
		);
		if (signatures.length === 1)
			applySignatureDeclaration(child, signatures[0]);
	});

	return result;
}

function serializeAnonymousCallableType(type: ts.Type) {
	if (
		type.aliasSymbol ||
		!isObjectType(type) ||
		!(type.objectFlags & tsLocal.ObjectFlags.Anonymous)
	)
		return;

	const signatures = typeChecker.getSignaturesOfType(
		type,
		tsLocal.SignatureKind.Call,
	);
	if (signatures.length) return serializeTypeObject(type, signatures);
}

function applySignatureDeclaration(
	result: Node,
	signature: ts.Signature | undefined,
) {
	const declaration = signature?.declaration;
	if (!signature || !declaration) return;

	result.source = getNodeSource(declaration);
	result.parameters = signature.getParameters().map(serializeParameter);
	const docs = getNodeDocs(
		declaration,
		result,
		tsLocal.getJSDocCommentsAndTags(declaration).filter(tsLocal.isJSDoc),
	);
	if (docs) result.docs = docs;
}

function isArrayType(type: ts.Type) {
	return typeChecker.isArrayType(type);
}

function serializeIntrinsicType(type: ts.Type) {
	if (type.flags & TF.Any) return AnyType;
	if (type.flags & TF.Unknown) return UnknownType;
	if (type.flags & TF.Void) return VoidType;
	if (type.flags & TF.Boolean) return BooleanType;
	if (type.flags & TF.BigInt) return BigIntType;
	if (type.flags & TF.Null) return NullType;
	if (type.flags & TF.Number) return NumberType;
	if (type.flags & TF.String) return StringType;
	if (type.flags & TF.Undefined) return UndefinedType;
	if (type.flags & TF.Never) return NeverType;
}

function getTypeArguments(type: ts.Type) {
	return isTypeReference(type)
		? typeChecker.getTypeArguments(type)
		: undefined;
}

function getTypeSymbol(type: ts.Type): ts.Symbol | undefined {
	return Object.prototype.hasOwnProperty.call(type, 'symbol')
		? type.symbol
		: undefined;
}

function serializeType(type: ts.Type): Node {
	if (type.aliasSymbol)
		return getSymbolReference(type.aliasSymbol, type.aliasTypeArguments);

	const intrinsic = serializeIntrinsicType(type);
	if (intrinsic) return intrinsic;
	if (isIndexType(type)) return serializeKeyofType(type);
	if (isIndexedAccessType(type)) return serializeIndexedAccessType(type);

	if (isObjectType(type) && isArrayType(type)) return serializeTypeObject(type);

	const typeSymbol = getTypeSymbol(type);

	if (typeSymbol && typeSymbol.flags & tsLocal.SymbolFlags.Namespace) {
		const result = getSymbolReference(typeSymbol);
		result.kind = Kind.ImportType;
		return result;
	}

	if (typeSymbol && isReferenceType(type))
		return getSymbolReference(
			typeSymbol,
			getTypeArguments(type),
		);

	if (type.flags & TF.Literal || type.flags & TF.TemplateLiteral) {
		const baseType = typeChecker.getBaseTypeOfLiteralType(type);
		if (
			type.isStringLiteral() ||
			type.isNumberLiteral() ||
			type.isLiteral() ||
			type.flags & TF.TemplateLiteral
		)
			return serializeLiteralType(type, baseType);
		return serializeType(baseType);
	}

	if (type.isUnionOrIntersection())
		return {
			name: '',
			flags: 0,
			kind: type.isUnion() ? Kind.TypeUnion : Kind.TypeIntersection,
			children: type.types.map(serializeType),
		};

	if (isObjectType(type)) return serializeTypeObject(type);

	if (typeSymbol) return serializeSymbol(typeSymbol);

	return {
		name: typeChecker.typeToString(type),
		kind: Kind.Unknown,
		flags: 0,
	};
}

function serializeFunction(
	node: ts.FunctionLikeDeclaration | ts.MethodSignature,
) {
	const result = serializeDeclaration(node);
	const signature = typeChecker.getSignatureFromDeclaration(node);

	if (node.kind === SK.ArrowFunction || node.kind === SK.FunctionExpression)
		result.kind = Kind.Function;
	else if (node.kind === SK.MethodSignature) result.kind = Kind.Method;

	if (node.type) result.type = serialize(node.type);

	if (node.typeParameters)
		result.typeParameters = node.typeParameters.map(serialize);

	result.parameters = signature
		? signature.getParameters().map(serializeParameter)
		: node.parameters.map(serialize);

	const type = typeChecker.getTypeAtLocation(node);
	const allSignatures = typeChecker.getSignaturesOfType(
		type,
		tsLocal.SignatureKind.Call,
	);

	if (
		allSignatures.length > 1 &&
		!typeChecker.isImplementationOfOverload(node)
	)
		result.flags = result.flags | Flags.Overload;

	if (signature && !result.type) {
		const type = signature.getReturnType();
		result.type = serializeType(type);
	}

	return result;
}

function serializeArray(node: ts.ArrayTypeNode) {
	const result = createNode(node, { name: 'Array' });
	// Should we store it as typeParameter?
	result.type = serialize(node.elementType);
	return result;
}

function isIdentifierCall(
	expression: ts.Expression,
): expression is ts.CallExpression & { expression: ts.Identifier } {
	return (
		tsLocal.isCallExpression(expression) &&
		tsLocal.isIdentifier(expression.expression)
	);
}

function getCxlDecorator(node: ts.Declaration, name: string) {
	if (!tsLocal.canHaveDecorators(node)) return undefined;
	const decorators = tsLocal.getDecorators(node);
	return decorators
		?.map(decorator => decorator.expression)
		.filter(isIdentifierCall)
		.find(
			expression =>
				expression.expression.text.endsWith(name),
		);
}

function isCxlAttribute(node: ts.Declaration, result: Node) {
	const deco = getCxlDecorator(node, 'Attribute');
	if (deco && isIdentifierCall(deco)) {
		const text = deco.expression.text;
		result.kind = text === 'EventAttribute' ? Kind.Event : Kind.Attribute;
	}
}

function getCxlRole(node: ts.CallExpression): string {
	const id = node.arguments[0];
	return id && tsLocal.isStringLiteral(id) ? id.text : '';
}

function findBaseComponent(node: ts.ClassDeclaration) {
	let type = typeChecker.getTypeAtLocation(node);

	while (true) {
		const decl: ts.Declaration | undefined = type.symbol.valueDeclaration;
		if (!decl || !tsLocal.isClassDeclaration(decl)) return false;

		const extend: ts.LeftHandSideExpression | undefined =
			decl.heritageClauses?.find(
				n => n.token === tsLocal.SyntaxKind.ExtendsKeyword,
			)?.types[0]?.expression;

		const newType: ts.Type | undefined =
			extend && typeChecker.getTypeAtLocation(extend);
		if (!newType || type === newType) break;

		const name = newType.symbol.name;
		if (name === 'Component') return true;

		type = newType;
	}
}

function getCxlClassMeta(
	node: ts.ClassDeclaration,
	symbol: ts.Symbol | undefined,
	result: Node,
): boolean {
	const augment = getCxlDecorator(node, 'Augment');
	const args = augment?.arguments;
	const docs: Documentation = result.docs || {};
	if (augment || (symbol && findBaseComponent(node)))
		result.kind = Kind.Component;
	else return false;

	if (result.children) {
		const tagNode = result.children.find(
			m =>
				m.name === 'tagName' &&
				m.kind === Kind.Property &&
				m.flags & Flags.Static,
		);
		if (tagNode?.value) docs.tagName = tagNode.value.slice(1, -1);
	}

	if (args) {
		args.forEach((arg, i) => {
			if (i === 0 && tsLocal.isStringLiteral(arg))
				docs.tagName = arg.text;
			else if (
				tsLocal.isCallExpression(arg) &&
				tsLocal.isIdentifier(arg.expression) &&
				arg.expression.text === 'role'
			)
				docs.role = getCxlRole(arg);
		});
	}

	if (docs.tagName || docs.role) result.docs = docs;

	return !!augment;
}

function serializeDeclarationWithType(node: ts.Declaration): Node {
	const result = serializeDeclaration(node);
	if (
		tsLocal.isVariableDeclaration(node) &&
		(tsLocal.isArrayBindingPattern(node.name) ||
			tsLocal.isObjectBindingPattern(node.name))
	) {
		// Object or Array destructuring items are stored as children
		result.children = node.name.elements.map(serialize);
	}

	if (currentOptions?.cxlExtensions) isCxlAttribute(node, result);

	if (!result.type) {
		const initializer = tsLocal.isVariableDeclaration(node)
			? node.initializer
			: undefined;
		const expression =
			initializer && tsLocal.isAwaitExpression(initializer)
				? initializer.expression
				: initializer;
		const importArgument =
			expression &&
			tsLocal.isCallExpression(expression) &&
			expression.expression.kind === SK.ImportKeyword
				? expression.arguments[0]
				: undefined;
		const nodeType = getDeclarationType(node);
		if (importArgument)
			result.type = createNode(importArgument, { kind: Kind.ImportType });
		else if (nodeType) result.type = serialize(nodeType);
		else if (
			tsLocal.isFunctionDeclaration(node) ||
			tsLocal.isMethodDeclaration(node)
		) {
			const sig = typeChecker.getSignatureFromDeclaration(node);
			if (sig) result.type = serializeType(sig.getReturnType());
		} else {
			try {
				const type = typeChecker.getTypeAtLocation(node);
				result.type = serializeType(type);
			} catch (e) {
				console.error(e);
			}
		}
	}

	if (tsLocal.isTypeAliasDeclaration(node)) {
		const typeObj = typeChecker.getTypeAtLocation(node);
		result.resolvedType = getResolvedType(typeObj);
	}

	return result;
}

function getDeclarationType(node: ts.Declaration) {
	if (
		tsLocal.isVariableDeclaration(node) ||
		tsLocal.isParameter(node) ||
		tsLocal.isPropertyDeclaration(node) ||
		tsLocal.isPropertySignature(node) ||
		tsLocal.isTypeAliasDeclaration(node) ||
		tsLocal.isParenthesizedTypeNode(node)
	)
		return node.type;
}

function pushChildren(parent: Node, nodes: Node[]) {
	parent.children ||= [];

	for (const n of nodes) {
		if (!n.parent) {
			Object.defineProperty(n, 'parent', {
				value: parent,
				enumerable: false,
			});
			parent.children.push(n);
		}
	}
}

function serializeObject(
	node: ts.TypeLiteralNode | ts.ObjectLiteralExpression,
) {
	const result = createNode(node);
	if (!result.children) {
		const children = tsLocal.isObjectLiteralExpression(node)
			? node.properties.map(serialize)
			: node.members.map(serialize);
		pushChildren(result, children);
	}
	return result;
}

function findSymbolOriginalFileNode(symbol: ts.Symbol) {
	const decl = getSymbolDeclaration(symbol);
	const sf = decl && getDeclarationOriginalFile(decl);
	return sf ? moduleMap?.[sf] : undefined;
}

function getSymbolFullyQualifiedName(symbol: ts.Symbol) {
	if (symbol.$$fqn) return symbol.$$fqn;

	const decl = symbol.getDeclarations()?.[0];
	const sourceFile = decl?.getSourceFile();
	const path = sourceFile?.path;
	if (path) return (symbol.$$fqn = `${path}.${symbol.getName()}`);

	return (symbol.$$fqn = typeChecker.getFullyQualifiedName(symbol));
}

function findExport(symbol?: ts.Symbol) {
	if (!symbol) return;

	if (currentOptions?.followReferences) {
		const sourceFile = findSymbolOriginalFileNode(symbol);
		if (sourceFile) {
			const existing = sourceFile.children?.find(
				c => c.name === symbol.name,
			);
			if (existing) return existing;
		}
	}

	const existing = exportIndex?.[getSymbolFullyQualifiedName(symbol)];
	return existing?.source ? existing : undefined;
}

function getMergedInterfaceResult(
	node: ts.InterfaceDeclaration,
	symbol: ts.Symbol,
) {
	if (symbol.flags & tsLocal.SymbolFlags.Class) return;
	let result = symbol[dtsNode];
	const declaration = symbol.declarations?.find(decl => decl[dtsNode]);
	if (!result && declaration) result = serializeDeclaration(declaration);
	result ??= findExport(symbol);
	if (
		result &&
		!(result.flags & Flags.Export) &&
		tsLocal.getCombinedModifierFlags(node) & tsLocal.ModifierFlags.Export
	)
		result.flags |= Flags.Export;
	symbol[dtsNode] ??= result;
	return result;
}

function addConstructorProperties(result: Node) {
	for (const member of result.children ?? [])
		if (member.kind === Kind.Constructor)
			for (const parameter of member.parameters ?? [])
				if (parameter.kind === Kind.Property)
					pushChildren(result, [parameter]);
}

function mergeClassDeclaration(
	node: ts.ClassDeclaration | ts.InterfaceDeclaration,
	symbol: ts.Symbol | undefined,
	result: Node,
) {
	if (
		!symbol ||
		!tsLocal.isInterfaceDeclaration(node) ||
		!(symbol.flags & tsLocal.SymbolFlags.Class)
	)
		return;
	const declaration = symbol.declarations?.[0] || symbol.valueDeclaration;
	result.flags |= Flags.DeclarationMerge;
	if (result.children && declaration)
		pushChildren(
			getNodeFromDeclaration(symbol, declaration),
			result.children.map(child => ({ ...child })),
		);
}

function addHeritage(result: Node, clauses: ts.NodeArray<ts.HeritageClause>) {
	const type: Node = {
		flags: 0,
		kind: Kind.ClassType,
		name: '',
		type: result,
	};
	result.type = type;
	clauses.forEach(clause => pushChildren(type, clause.types.map(serialize)));
	for (const child of type.children ?? [])
		if (child.kind === Kind.Reference && child.type) {
			child.type.extendedBy ??= [];
			child.type.extendedBy.push({
				name: result.name,
				type: result,
				kind: Kind.Reference,
				flags: 0,
			});
		}
}

function serializeClass(node: ts.ClassDeclaration | ts.InterfaceDeclaration) {
	const symbol =
		typeChecker.getSymbolAtLocation(node) ||
		(node.name && typeChecker.getSymbolAtLocation(node.name));
	let result =
		tsLocal.isInterfaceDeclaration(node) && symbol
			? getMergedInterfaceResult(node, symbol)
			: undefined;
	result ??= serializeDeclaration(node);
	if (!result.children || tsLocal.isInterfaceDeclaration(node))
		pushChildren(result, node.members.map(serialize));
	addConstructorProperties(result);
	mergeClassDeclaration(node, symbol, result);
	if (tsLocal.isClassDeclaration(node) && currentOptions?.cxlExtensions)
		getCxlClassMeta(node, symbol, result);
	if (node.heritageClauses?.length) addHeritage(result, node.heritageClauses);
	return result;
}

function getTypeDeclaration(type: ts.Type, symbol: ts.Symbol) {
	const OF = tsLocal.ObjectFlags;
	const kind =
		isObjectType(type) && type.objectFlags & OF.Interface
			? SK.InterfaceDeclaration
			: undefined;
	const decl = kind
		? symbol.declarations?.find(d => d.kind === kind)
		: symbol.declarations?.[0] || symbol.valueDeclaration;

	return decl;
}

function serializeReference(node: ts.TypeReferenceType) {
	const typeObj = typeChecker.getTypeFromTypeNode(node);

	let symbol = typeObj.aliasSymbol || getTypeSymbol(typeObj);
	if (!symbol && tsLocal.isTypeReferenceNode(node))
		symbol = typeChecker.getSymbolAtLocation(node.typeName);

	if (symbol && symbol.flags & tsLocal.SymbolFlags.Alias)
		symbol = typeChecker.getAliasedSymbol(symbol);

	let type: Node | undefined;
	if (symbol) {
		const declaration = getTypeDeclaration(typeObj, symbol);
		if (declaration) type = getNodeFromDeclaration(symbol, declaration);
	}
	if (!type && !(node.flags & tsLocal.NodeFlags.Synthesized))
		type = serializeType(typeObj);
	const name = getNodeName(
		tsLocal.isTypeReferenceNode(node) ? node.typeName : node.expression,
	);
	if (type && !type.name) type.name = name;

	const resolvedType =
		type?.kind === 0
			? getResolvedType(typeObj)
			: serializeAnonymousCallableType(typeObj);

	return createNode(node, {
		name,
		kind: Kind.Reference,
		type,
		resolvedType,
		typeParameters: node.typeArguments?.map(serialize),
	});
}

function serializeConditionalType(node: ts.ConditionalTypeNode) {
	return createNode(node, {
		children: [
			serialize(node.checkType),
			serialize(node.extendsType),
			serialize(node.trueType),
			serialize(node.falseType),
		],
	});
}

function serializeConstructor(node: ts.ConstructorDeclaration) {
	const result = serializeFunction(node);
	result.name = 'constructor';
	return result;
}

function serializeIndexedAccessTypeNode(node: ts.IndexedAccessTypeNode) {
	return createNode(node, {
		children: [serialize(node.objectType), serialize(node.indexType)],
	});
}

function serializeIndexSignature(node: ts.IndexSignatureDeclaration) {
	return createNode(node, {
		id: createNodeId(node),
		name: '__index',
		parameters: node.parameters.map(serialize),
		type: serialize(node.type),
	});
}

function serializeTypeOperator(node: ts.TypeOperatorNode) {
	const result = createNode(node, {
		kind: SyntaxKindMap[node.operator],
		type: serialize(node.type),
	});

	const type =
		node.flags & tsLocal.NodeFlags.Synthesized
			? undefined
			: typeChecker.getTypeFromTypeNode(node);
	if (type) {
		const resolvedType = serializeType(type);
		if (resolvedType.kind !== result.kind)
			result.resolvedType = resolvedType;
	}
	return result;
}

function serializeTypeQuery(node: ts.TypeQueryNode) {
	const result = createNode(node);
	result.name = getNodeName(node.exprName);
	return result;
}

function serializeTuple(node: ts.TupleTypeNode) {
	return createNode(node, {
		children: node.elements.map(serialize),
	});
}

function serializeRestType(node: ts.RestTypeNode) {
	const result = serialize(node.type);
	result.flags |= Flags.Rest;
	return result;
}

function serializeMappedType(node: ts.MappedTypeNode) {
	const result = createNode(node);
	const type = serialize(node.typeParameter);
	result.children = [type];
	if (type.children?.[0]) {
		result.children.push(type.children[0]);
		type.children = undefined;
	}
	if (node.type) result.type = serialize(node.type);
	return result;
}

function serializeExportSpecifier(node: ts.ExportSpecifier) {
	const symbol = typeChecker.getExportSpecifierLocalTargetSymbol(node);
	if (symbol) {
		const result = serializeSymbol(symbol);
		result.name = node.name.text;
		result.flags |= Flags.Export;
		if (result.kind === Kind.Unknown) result.kind = Kind.Export;
		return result;
	}
	return serializeDeclarationWithType(node);
}

function normalizeSourceFileName(name: string) {
	const root = currentOptions?.rootDir ?? config?.options.rootDir ?? '';
	return relative(root, name);
}

function normalizeModuleName(symbol: ts.Symbol) {
	let parent: ts.Symbol | undefined = symbol;
	const result = [
		symbol.valueDeclaration?.kind === SK.SourceFile &&
		symbol.name.startsWith('"')
			? `"${normalizeSourceFileName(symbol.name.slice(1, -1))}"`
			: symbol.name,
	];

	while ((parent = parent.parent)) {
		if (parent.valueDeclaration?.kind !== SK.SourceFile)
			result.unshift(parent.name);
	}

	return result.join('.');
}

function findModuleResultNode(
	node: ts.ModuleDeclaration,
	symbol: ts.Symbol | undefined,
) {
	const moduleName = symbol ? normalizeModuleName(symbol) : undefined;
	if (symbol) {
		if (symbol.$$moduleResult) return symbol.$$moduleResult;
		if (moduleName && currentOptions?.followReferences) {
			const existing =
				parseModule(symbol, node.getSourceFile()) ||
				moduleMap?.[moduleName];
			if (existing) return (symbol.$$moduleResult = existing);
		}
	}

	const result = serializeDeclaration(node);
	if (symbol) symbol.$$moduleResult = result;
	if (moduleName) {
		if (currentOptions?.forceExports?.includes(moduleName))
			result.flags |= Flags.Export;

		result.name = moduleName;
		if (moduleMap) moduleMap[moduleName] = result;
	}
	return result;
}

function shouldPublishNamespace(symbol: ts.Symbol | undefined, result: Node) {
	if (!symbol) return false;

	if (extraModules?.includes(result)) return false;

	if (currentOptions?.exportsOnly) {
		// Publish namespace only if all parents are exported
		let parent: ts.Symbol | undefined = symbol;
		do {
			if (parent.valueDeclaration?.kind === SK.SourceFile) break;
			const dtsNode = parent.$$moduleResult;
			if (!dtsNode || !(dtsNode.flags & Flags.Export)) return false;
		} while ((parent = parent.parent));
	}
	return true;
}

function serializeModule(node: ts.ModuleDeclaration) {
	const symbol =
		typeChecker.getSymbolAtLocation(node) ||
		typeChecker.getSymbolAtLocation(node.name);

	const result = findModuleResultNode(node, symbol);
	node.body?.forEachChild(c => visit(c, result));

	if (symbol && result.flags & Flags.Export) collectExports(symbol);

	if (shouldPublishNamespace(symbol, result)) {
		extraModules?.push(result);
	}

	return result;
}

function serializeImportType(node: ts.ImportTypeNode) {
	const symbol = typeChecker.getSymbolAtLocation(node);
	if (symbol) {
		const result = getSymbolReference(symbol);
		result.kind = Kind.ImportType;
		return result;
	}

	return createNode(node, {});
}

function serializeSpread(node: ts.SpreadAssignment) {
	const result = createNode(node);
	result.children = [serialize(node.expression)];
	return result;
}

const Serializer: SerializerMap = {
	[SK.AnyKeyword]: () => AnyType,
	[SK.StringKeyword]: () => StringType,
	[SK.NumberKeyword]: () => NumberType,
	[SK.BooleanKeyword]: () => BooleanType,
	[SK.VoidKeyword]: () => VoidType,
	[SK.NeverKeyword]: () => NeverType,
	[SK.NullKeyword]: () => NullType,
	[SK.FunctionType]: serializeFunction,
	[SK.CallSignature]: serializeFunction,
	[SK.ConstructSignature]: serializeFunction,
	[SK.UndefinedKeyword]: () => UndefinedType,

	[SK.ArrayType]: serializeArray,
	[SK.FunctionDeclaration]: serializeFunction,
	[SK.ArrowFunction]: serializeFunction,
	[SK.FunctionExpression]: serializeFunction,
	[SK.TypeReference]: serializeReference,
	[SK.ExpressionWithTypeArguments]: serializeReference,
	[SK.ConditionalType]: serializeConditionalType,
	[SK.ParenthesizedType]: serializeDeclarationWithType,
	[SK.InferType](node: ts.InferTypeNode) {
		return createNode(node, {
			type: serialize(node.typeParameter),
		});
	},

	[SK.TypeQuery]: serializeTypeQuery,
	[SK.IndexedAccessType]: serializeIndexedAccessTypeNode,
	[SK.IntersectionType](node: ts.UnionTypeNode) {
		return createNode(node, {
			kind: Kind.TypeIntersection,
			children: node.types.map(serialize),
		});
	},
	[SK.UnionType](node: ts.UnionTypeNode) {
		const type = node.$$resolvedType
			? undefined
			: typeChecker.getTypeAtLocation(node);
		return createNode(node, {
			kind: Kind.TypeUnion,
			children: node.types.map(serialize),
			resolvedType: type && getResolvedType(type),
		});
	},
	[SK.TupleType]: serializeTuple,
	[SK.EnumDeclaration]: serializeClass,
	[SK.EnumMember]: serializeDeclarationWithType,
	[SK.RestType]: serializeRestType,

	[SK.PropertySignature]: serializeDeclarationWithType,
	[SK.Constructor]: serializeConstructor,
	[SK.Parameter]: serializeDeclarationWithType,
	[SK.PropertyDeclaration]: serializeDeclarationWithType,
	[SK.MethodDeclaration]: serializeFunction,
	[SK.MethodSignature]: serializeFunction,
	[SK.ClassDeclaration]: serializeClass,
	[SK.TypeAliasDeclaration]: serializeDeclarationWithType,
	[SK.TypeParameter]: serializeTypeParameter,
	[SK.InterfaceDeclaration]: serializeClass,
	[SK.VariableDeclaration]: serializeDeclarationWithType,
	[SK.BindingElement]: serializeDeclarationWithType,
	[SK.ConstructorType]: serializeConstructor,
	[SK.GetAccessor]: serializeFunction,
	[SK.SetAccessor]: serializeFunction,
	[SK.TypeOperator]: serializeTypeOperator,

	[SK.TypeLiteral]: serializeObject,
	[SK.TemplateLiteralType]: serializeDeclaration,
	[SK.ObjectLiteralExpression]: serializeObject,
	[SK.PropertyAssignment]: serializeDeclarationWithType,
	[SK.ShorthandPropertyAssignment]: serializeDeclarationWithType,

	[SK.IndexSignature]: serializeIndexSignature,
	[SK.MappedType]: serializeMappedType,
	[SK.SpreadAssignment]: serializeSpread,
	[SK.ModuleDeclaration]: serializeModule,
	[SK.NamespaceExport]: serializeDeclarationWithType,
	[SK.NamespaceImport]: serializeDeclarationWithType,
	[SK.ExportSpecifier]: serializeExportSpecifier,
	[SK.ImportType]: serializeImportType,
	[SK.SymbolKeyword]: serializeDeclaration,
};

function setup(
	{ options, errors, fileNames, projectReferences }: ts.ParsedCommandLine,
	dtsOptions: BuildOptions,
	host?: ts.CompilerHost,
) {
	options.noEmit = true;
	if (!host) host = tsLocal.createCompilerHost(options);

	program = tsLocal.createProgram({
		configFileParsingDiagnostics: errors,
		rootNames: fileNames,
		projectReferences,
		options,
		host,
	});
	typeChecker = program.getTypeChecker();
	const diagnostics = tsLocal.getPreEmitDiagnostics(program);
	if (dtsOptions.debug && diagnostics.length) {
		console.warn(
			tsLocal.formatDiagnosticsWithColorAndContext(diagnostics, host),
		);
	}
}

/**
 * Returns node original file if it comes from a project reference.
 */
function getDeclarationOriginalFile(decl: ts.Declaration) {
	const sourceFile =
		tsLocal.isSourceFile(decl) ? decl : decl.getSourceFile();
	return sourceFile.isDeclarationFile
		? sourceFile.originalFileName
		: undefined;
}

function findSourceFileReference(path: string) {
	const references = program.getResolvedProjectReferences();
	if (references)
		return references.find(ref =>
			ref?.commandLine.fileNames.includes(path),
		);
}

function parseModule(symbol: ts.Symbol, from: ts.SourceFile) {
	const sf = getSymbolDeclaration(symbol);

	if (sf && tsLocal.isSourceFile(sf) && !sourceFiles.includes(sf)) {
		if (sf.isDeclarationFile) {
			if (currentOptions?.followReferences) {
				const originalPath = getDeclarationOriginalFile(sf);
				const project =
					originalPath && findSourceFileReference(originalPath);
				if (project) {
					buildReference(project.commandLine, currentOptions);
					const moduleName = normalizeSourceFileName(originalPath);
					return extraModules?.find(m => m.name === moduleName);
				}
			}
			if (from.isDeclarationFile) return parseSourceFile(sf);
		} else return parseSourceFile(sf);
	}
}

function visit(n: ts.Node, parent: Node) {
	function push(node: ts.Node) {
		const child = serialize(node);
		if (!currentOptions?.exportsOnly || child.flags & Flags.Export)
			pushChildren(parent, [child]);
	}
	if (tsLocal.isVariableStatement(n)) {
		n.declarationList.declarations.map(push);
	} else if (tsLocal.isExportDeclaration(n)) {
		if (n.exportClause) {
			if (tsLocal.isNamedExports(n.exportClause))
				n.exportClause.elements.forEach(push);
			else push(n.exportClause);
		} else if (n.moduleSpecifier) {
			// Handle export * from 'module';
			const symbol = typeChecker.getSymbolAtLocation(n.moduleSpecifier);
			if (symbol) parseModule(symbol, n.getSourceFile());
		}
		} else if (tsLocal.isModuleDeclaration(n)) {
			serializeModule(n);
		} else
			switch (n.kind) {
			case SK.InterfaceDeclaration:
			case SK.TypeAliasDeclaration:
			case SK.FunctionDeclaration:
			case SK.EnumDeclaration:
			case SK.VariableDeclaration:
			case SK.ClassDeclaration:
				push(n);
				break;
				default:
				break;
		}
}

function collectExports(symbol: ts.Symbol) {
	symbol.exports?.forEach(s => {
		const node = getSymbolDeclaration(s);
		const localNode = node?.[dtsNode];
		if (
			localNode?.source &&
			!(localNode.flags & Flags.Internal) &&
			exportIndex
		) {
			exportIndex[getSymbolFullyQualifiedName(s)] = localNode;
		}
	});
}

function parseSourceFile(sourceFile: ts.SourceFile): Node {
	const existing = moduleMap?.[sourceFile.fileName];
	if (existing) return existing;
	const result = createNode(sourceFile);

	if (moduleMap) moduleMap[sourceFile.fileName] = result;

	if (result.flags & Flags.Internal) return result;
	sourceFile.forEachChild(c => visit(c, result));

	const symbol = typeChecker.getSymbolAtLocation(sourceFile);
	if (symbol) collectExports(symbol);

	if (sourceFile.isDeclarationFile)
		sourceFile.referencedFiles.forEach(ref => {
			const fn = ref.fileName;
			if (config?.fileNames.includes(fn)) return;

			const sf = program.getSourceFile(fn);
			if (
				sf &&
				!program.isSourceFileDefaultLibrary(sf) &&
				!program.isSourceFileFromExternalLibrary(sf)
			) {
				parseSourceFile(sf);
			}
		});

	if (result.children?.length) extraModules?.push(result);

	return result;
}

/**
 * Generate AST from a source string
 *
 * @param source Source to parse
 * @param options Typescript compiler options
 */
export function parse(options: ParseOptions): Node[] {
	const compilerOptions = {
		...{
			lib: ['lib.es2022.d.ts'],
			module: tsLocal.ModuleKind.ESNext,
			target: tsLocal.ScriptTarget.ESNext,
			types: [],
			declaration: false,
			noEmit: true,
		},
		...options.compilerOptions,
	};
	const fileName = options.fileName || `(${Date.now()}).tsx`;

	const host = tsLocal.createCompilerHost(compilerOptions);
	const oldGetSourceFile = host.getSourceFile;
	let sourceFile: ts.SourceFile | undefined;
	currentOptions = {
		...defaultOptions,
		...options,
	};
	currentIndex = {};
	extraModules = [];
	moduleMap = {};
	exportIndex = {};
	currentId = 1;

	host.getSourceFile = function (
		fn: string,
		target: ts.ScriptTarget,
		onError?: (message: string) => void,
		shouldCreateNewSourceFile?: boolean,
	) {
		return fn === fileName
			? (sourceFile = tsLocal.createSourceFile(
					fileName,
					options.source,
					target,
				))
			: oldGetSourceFile.call(
					this,
					fn,
					target,
					onError,
					shouldCreateNewSourceFile,
				);
	};

	setup(
		{ fileNames: [fileName], options: compilerOptions, errors: [] },
		currentOptions,
		host,
	);
	if (!sourceFile) throw new Error('Invalid Source File');
	sourceFiles = [sourceFile];

	const sourceNode = parseSourceFile(sourceFile);
	return sourceNode.children || extraModules;
}

function buildProject(config: ts.ParsedCommandLine, options: BuildOptions) {
	setup(config, options);
	sourceFiles = config.fileNames.flatMap(
		fp => program.getSourceFile(fp) || [],
	);
	sourceFiles.forEach(parseSourceFile);
}

function buildReference(config: ts.ParsedCommandLine, options: BuildOptions) {
	const path = config.options.configFilePath;
	if (!path) return;

	if (!builtReferences?.includes(path)) {
		const oldProgram = program;
		const oldTypeChecker = typeChecker;

		builtReferences?.push(path);
		buildProject(config, options);

		program = oldProgram;
		typeChecker = oldTypeChecker;
	}
}

function isPrepended(reference: ts.ProjectReference) {
	const legacyReference: { prepend?: boolean } = reference;
	return legacyReference.prepend;
}

function buildTsconfig(
	config: ts.ParsedCommandLine,
	options: BuildOptions,
): Output {
	currentOptions = options;
	moduleMap = {};
	exportIndex = {};
	builtReferences = [];
	sourceFiles = [];
	extraModules = [];
	currentIndex = {};
	const result = {
		modules: extraModules,
		index: currentIndex,
		config,
		env: {
			typescript: tsLocal.version,
		},
	};

	config.projectReferences?.forEach(reference => {
		if (isPrepended(reference))
			buildReference(
				parseTsConfig(tsLocal.resolveProjectReferencePath(reference)),
				options,
			);
	});

	buildProject(config, options);

	return result;
}

export function buildConfig(
	json: object,
	basePath: string,
	options?: BuildOptions,
): Output {
	config = tsLocal.parseJsonConfigFileContent(
		json,
		parseConfigHost,
		basePath,
	);
	return buildTsconfig(config, {
		...defaultOptions,
		...options,
	});
}

/**
 * Generate AST from a tsconfig file
 *
 * @param tsconfig Path to tsconfig.json file
 */
export function build(
	tsconfig: string = resolve('tsconfig.json'),
	options?: Partial<BuildOptions>,
): Output {
	const allOptions = {
		...defaultOptions,
		...options,
	};
	config = parseTsConfig(tsconfig, allOptions);
	return buildTsconfig(config, allOptions);
}
