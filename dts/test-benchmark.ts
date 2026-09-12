import { spec } from '@cxl/spec';
import type { Test } from '@cxl/spec';

import { parse } from './index.js';

const source = `
	export interface Item<T> { value: T; next?: Item<T> }
	export class Store<T> implements Item<T> {
		constructor(public value: T, public next?: Item<T>) {}
		map<U>(fn: (value: T) => U): Store<U> { return new Store(fn(this.value)); }
	}
	export type Result<T> = T extends Promise<infer U> ? U : T;
	export function create<T>(value: T): Store<T> { return new Store(value); }
`;

const returnTypeSource = `
	function createApi() {
		/** Call docs. @param value Call value. */
		function api(value: string): boolean { return !!value; }
		/** Child docs. @param count Child count. */
		api.child = function child(count: number): void {};
		return api;
	}
	export interface Git { api: ReturnType<typeof createApi> }
	export type Api = ReturnType<typeof createApi>;
`;

const benchmark: Test = spec('dts benchmark', a => {
	a.test('parse representative declarations', a => {
		let result = parse({ source });
		for (let i = 0; i < 49; i++) result = parse({ source });
		a.equal(result.length, 4);
	});

	a.test('parse resolved callable ReturnType', a => {
		let result = parse({ source: returnTypeSource });
		for (let i = 0; i < 49; i++)
			result = parse({ source: returnTypeSource });
		a.equal(result.length, 2);
	});
});

export default benchmark;
