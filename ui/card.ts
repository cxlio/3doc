import { Component, component, css, tsx } from '@cxl/ui';

export class DocCard extends Component {}

component(DocCard, {
	tagName: 'doc-card',
	augment: [
		css(`
:host{margin-top: 16px; display:block; padding:16px; elevation:1; }
		`),
		() => {
			/*const srclink = $.getAttribute('src');
			const see =
				srclink && docgen.repository
					? ((
							<a
								title="See Source"
								target="_blank"
								href={`${docgen.repository}/${srclink}`}
							>
								{'</>'}
							</a>
					  ) as HTMLElement)
					: undefined;
			if (see) {
				see.style.float = 'right';
				see.style.textDecoration = 'none';
			}*/
			return tsx('slot');
		},
	],
});
