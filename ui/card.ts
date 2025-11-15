import { Component, component, css, media, tsx } from '@cxl/ui';

export class DocCard extends Component {}

component(DocCard, {
	tagName: 'doc-card',
	augment: [
		css(`
:host{margin-top: 16px; display:block; elevation:1; }
${media('medium', ':host{padding:16px}')}
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
