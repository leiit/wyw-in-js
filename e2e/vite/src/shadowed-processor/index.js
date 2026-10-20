import { css as e } from '@wyw-in-js/template-tag-syntax';

export const title = e`
  color: shadowed-red;
`;

// Shaped like minified code: the parameter `e` shadows the imported `css`, so
// `e(t)` calls the argument, not the processor.
export const mapAll = (e, t) => t.map((t) => e(t));
