/**
 * Jest SVG Transform
 * Transforms SVG file imports into React components for testing
 */
const React = require('react');

module.exports = {
  process() {
    return {
      code: `
        const React = require('react');
        const SvgMock = React.forwardRef(function SvgMock(props, ref) {
          return React.createElement('svg', { ref, ...props, 'data-testid': 'svg-mock' });
        });
        SvgMock.displayName = 'SvgMock';
        module.exports = SvgMock;
        module.exports.default = SvgMock;
        module.exports.ReactComponent = SvgMock;
      `,
    };
  },
};
