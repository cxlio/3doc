import { Kind, Flags } from '../dts/enum.js';

import type { Documentation } from '../dts';
export { Kind, Flags };

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

export function getComponentIcon(item: Summary) {
	const icon = item.docs?.content?.find(c => c.tag === 'icon')?.value;
	return (icon as string) ?? 'brick';
}

export function docgen(json: SummaryJson) {
	const all = json.index;

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

		return type.resolvedType && typeof type.resolvedType !== 'string'
			? type.resolvedType
			: type;
	}

	function getNodeOwnProperties(
		node: Summary,
		result: Record<string, Summary>,
	) {
		if (!node.children) return;

		for (const child of node.children) {
			if (!child.name || (child.flags && child.flags & Flags.Abstract))
				continue;
			result[child.name] ??= child;
		}

		return result;
	}

	function getNodeProperties(
		node: Summary,
		result: Record<string, Summary> = {},
	) {
		getNodeOwnProperties(node, result);

		const type = getTypeSummary(node.type);
		if (type?.children)
			for (const node of type.children) {
				const nodeType = getTypeSummary(node);
				if (
					!nodeType ||
					nodeType.kind !== Kind.Component ||
					nodeType.name === 'Component'
				)
					break;

				getNodeProperties(nodeType, result);
			}

		return result;
	}

	function isFunction(node: Summary) {
		return (
			node.kind === Kind.FunctionType ||
			node.kind === Kind.Function ||
			node.kind === Kind.Method ||
			node.kind === Kind.Setter
		);
	}

	return {
		getNodeProperties,
		getTypeSummary,
		isFunction,
		getRef,
		json,
	};
}
