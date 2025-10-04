import { spec } from '@cxl/spec';
import * as ui from './index.js';

export default spec('3doc.ui', s => {
	s.test('load', it => {
		it.ok(ui);
	});
});
