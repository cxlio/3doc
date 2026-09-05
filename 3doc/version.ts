import { promises as fs, readdirSync, statSync } from 'fs';
import { join } from 'path';

const VERSION_PATTERN = /^(\d+)\.(\d+)\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function versionLine(version: string): string | undefined {
	const match = VERSION_PATTERN.exec(version);
	return match ? `${match[1]}.${match[2]}` : undefined;
}

export function isSameVersionLine(a: string, b: string): boolean {
	const line = versionLine(a);
	return line !== undefined && line === versionLine(b);
}

export function findOtherVersions(
	outputDir: string,
	currentVersion: string,
): string[] {
	try {
		return readdirSync(outputDir).filter(
			version =>
				version !== currentVersion &&
				!isSameVersionLine(version, currentVersion) &&
				statSync(join(outputDir, version)).isDirectory(),
		);
	} catch {
		return [];
	}
}

export async function removeOlderPatchVersions(
	outputDir: string,
	currentVersion: string,
): Promise<void> {
	const entries = await fs.readdir(outputDir, { withFileTypes: true });
	await Promise.all(
		entries
			.filter(
				entry =>
					entry.isDirectory() &&
					entry.name !== currentVersion &&
					isSameVersionLine(entry.name, currentVersion),
			)
			.map(entry =>
				fs.rm(join(outputDir, entry.name), {
					recursive: true,
					force: true,
				}),
			),
	);
}
