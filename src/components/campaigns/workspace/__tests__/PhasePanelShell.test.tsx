import React from 'react';
import { render, screen } from '@testing-library/react';
import { PhasePanelShell } from '../PhasePanelShell';

describe('PhasePanelShell', () => {
  it('renders title and children', () => {
    render(<PhasePanelShell phaseKey="discovery" title="Discovery Configuration"><div>Inner</div></PhasePanelShell>);
    expect(screen.getByText(/Discovery Configuration/)).toBeInTheDocument();
    expect(screen.getByText('Inner')).toBeInTheDocument();
  });
});
