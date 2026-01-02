import React from 'react';

interface DomainFlowLogoProps {
  size?: number;
  className?: string;
}

export const DomainFlowLogo: React.FC<DomainFlowLogoProps> = ({
  size = 24,
  className,
}) => {
  const width = size * 5.5;
  const height = size;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 132 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DomainFlow"
    >
      <text
        x="0"
        y="18"
        fill="currentColor"
        fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="18"
        fontWeight="500"
        letterSpacing="-0.02em"
      >
        DomainFlow
      </text>
    </svg>
  );
};

export default DomainFlowLogo;
