/**
 * SVG Mock for Jest
 * Transforms SVG imports into React components for testing
 */
import React from 'react';

const SvgMock = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>((props, ref) => (
  <svg ref={ref} {...props} data-testid="svg-mock" />
));

SvgMock.displayName = 'SvgMock';

export default SvgMock;
export const ReactComponent = SvgMock;
