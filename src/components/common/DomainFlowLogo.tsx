import React from 'react';

interface DomainFlowLogoProps {
  size?: number;
  className?: string;
}

export const DomainFlowLogo: React.FC<DomainFlowLogoProps> = ({
  size = 24,
  className,
}) => {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
        fontSize: size * 0.75, // 18px when size = 24
        fontWeight: 500,
        letterSpacing: '-0.02em',
        lineHeight: 1,
        color: 'currentColor',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
      aria-label="DomainFlow"
    >
      DomainFlow
    </span>
  );
};

export default DomainFlowLogo;