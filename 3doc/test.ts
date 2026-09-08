import { Test, TestApi, spec } from '@cxl/spec';
import { renderJson, SignatureText } from './render-summary.js';
import { Kind, parse as _parse } from '../dts/index.js';
import type { Node, Output } from '../dts/index.js';
import { findOtherVersions } from './version.js';
import { buildDocs } from './render.js';
import type { BuildDocsOptions } from './render.js';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export function node(p: Partial<Node>): Node {
	return { name: 'A', kind: Kind.Unknown, flags: 0, ...p };
}

function parse(options: { source: string; fileName?: string }) {
	return _parse({
		...options,
		exportsOnly: false,
		cxlExtensions: true,
	});
}

function buildFixture() {
	const rootDir = mkdtempSync(join(tmpdir(), '3doc-build-'));
	const outputDir = join(rootDir, 'docs');
	const packageJson = join(rootDir, 'package.json');
	const file = join(rootDir, 'index.ts');
	mkdirSync(join(outputDir, '6.0.4'), { recursive: true });
	mkdirSync(join(outputDir, '6.1.0', 'nested'), { recursive: true });
	mkdirSync(join(outputDir, '6.1.notes'));
	writeFileSync(join(outputDir, '6.1.0', 'nested', 'index.html'), 'old');
	writeFileSync(packageJson, '{"name":"test","version":"6.1.1"}');
	writeFileSync(file, 'export const value = 1;');
	return {
		rootDir,
		outputDir,
		config: {
			rootDir,
			outputDir,
			packageJson,
			file: [file],
			summary: true,
			noHtml: true,
		} as BuildDocsOptions,
	};
}

const tests: Test = spec('docgen', s => {
	s.test('render-html', it => {
		it.should('replace the previous patch version', a => {
			const outputDir = mkdtempSync(join(tmpdir(), '3doc-versions-'));

			try {
				mkdirSync(join(outputDir, '6.0.4'));
				mkdirSync(join(outputDir, '6.1.0'));
				a.equalValues(findOtherVersions(outputDir, '6.1.1'), [
					'6.0.4',
				]);
			} finally {
				rmSync(outputDir, { recursive: true });
			}
		});

		it.should('remove older patches after successful generation', async a => {
			const fixture = buildFixture();

			try {
				await buildDocs(fixture.config, async () => {});
				a.ok(existsSync(join(fixture.outputDir, '6.0.4')));
				a.ok(!existsSync(join(fixture.outputDir, '6.1.0')));
				a.ok(existsSync(join(fixture.outputDir, '6.1.1')));
				a.ok(existsSync(join(fixture.outputDir, '6.1.notes')));
			} finally {
				rmSync(fixture.rootDir, { recursive: true });
			}
		});

		it.should('retain older patches when generation fails', async a => {
			const fixture = buildFixture();
			let failed = false;

			try {
				await buildDocs(fixture.config, async () => {
					throw new Error('write failed');
				});
			} catch {
				failed = true;
			}

			try {
				a.ok(failed);
				a.ok(existsSync(join(fixture.outputDir, '6.1.0')));
			} finally {
				rmSync(fixture.rootDir, { recursive: true });
			}
		});

		it.test('MappedType', it => {
			/*it.should('render type alias', a => {
				const [A] = parse({
					source: `type A<T> = { [P in keyof T]: T[P]; }`,
				});
				const R = A && SignatureText(A);
				a.equal(
					R,
					'A&lt;T&gt; = { [P in keyof <a href="#s2">T</a>]: <a href="#s2">T</a>[<a href="#s3">P</a>] }',
				);
			});*/

			it.test('render function result', a => {
				const [, , C] = parse({
					source: `
	abstract class Component extends Array { }
	const registeredComponents: Record<string, typeof Component> = {};
	export function getRegisteredComponents() {
		return { ...registeredComponents };
	}
				`,
				});
				const R = C && SignatureText(C);
				a.equal(
					R,
					'getRegisteredComponents(): { [x: string]: typeof Component }',
				);
			});
		});

		it.test('UnionType', it => {
			it.should('render function type', a => {
				const [A] = parse({
					source: `function A(): { type: 'A' | 'B' } { return { type: 'A' } }`,
				});
				const R = A && SignatureText(A);
				a.equal(R, `A(): { type: 'A' | 'B' }`);
			});
			/*it.test('render function type', a => {
				const [A] = parse(`
					function A() { return B(); }
					function B(): Array<Event> { return [{ type: 'A' }] };
					type Event = { type: 'A' | 'B' } | { type: 'C' }
					`);
				const R = SignatureText(A);
				a.equal(R, `A(): { type: 'A' | 'B' }`);
			});*/
		});

		it.test('TypeAlias', it => {
			it.should('preserve indexed access types', (a: TestApi) => {
				const nodes = parse({
					source: `
						interface ShellApi { git(...args: string[]): Promise<string>; }
						export type Git = ShellApi['git'];
					`,
				});
				const summary = renderJson({
					index: Object.fromEntries(nodes.map(n => [n.id, n])),
				} as Pick<Output, 'index'> as Output);
				const git = summary.index.find(n => n.name === 'Git');

				a.assert(typeof git?.type === 'object');

				a.equal(git.type.kind, Kind.IndexedType);
				a.equal(git.type.children?.[0]?.name, "'git'");
				a.equal(git.type.children?.[1]?.name, 'ShellApi');
			});

			/*it.should('render union', a => {
				const [A] = parse({
					source: `type A<T> = { [P in keyof T]: T[P]; } & { name: string };`,
				});
				const R = A && SignatureText(A);
				a.equal(
					R,
					'A&lt;T&gt; = { [P in keyof <a href="#s2">T</a>]: <a href="#s2">T</a>[<a href="#s3">P</a>] } & { name: string }',
				);
			});*/

			it.should('render extends', a => {
				const [A] = parse({
					fileName: 'extends.ts',
					source: `
					type A<T extends Component> = keyof T;
					interface Component { }
				`,
				});
				const R = A && SignatureText(A);
				a.equal(
					R,
					'A&lt;T extends <a href="extends--Component.html">Component</a>&gt; = keyof <a href="#s2">T</a>',
				);
			});
		});
	});
});

export default tests;
