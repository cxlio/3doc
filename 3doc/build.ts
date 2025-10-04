import { buildLibrary, exec, file } from '@cxl/build';
import { concat } from '@cxl/rx';

buildLibrary({
	target: 'package',
	outputDir: '../dist/3doc/package',
	tasks: [
		concat(
			exec('npm run build package --prefix ../ui'),
			file('../dist/ui/package/index.bundle.js', '3doc.js'),
		),
	],
});
