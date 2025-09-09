import React from 'react';
import { render } from '@testing-library/react';
import { PhaseStepper } from '../PhaseStepper';
import { PhasePanelShell } from '../PhasePanelShell';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Workspace a11y', () => {
  it('PhaseStepper has no basic accessibility violations', async () => {
    const { container } = render(<PhaseStepper phases={[
      { key: 'discovery', label: 'Discovery', order: 0, configState: 'valid', execState: 'completed' },
      { key: 'validation', label: 'Validation', order: 1, configState: 'missing', execState: 'not_started' },
    ]} activePhase="discovery" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('PhasePanelShell has no basic accessibility violations', async () => {
    const { container } = render(
      <PhasePanelShell phaseKey="discovery" title="Discovery Configuration">
        <form>
          <label htmlFor="x" className="text-xs">Field</label>
          <input id="x" name="x" className="border p-1 text-xs" />
        </form>
      </PhasePanelShell>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
