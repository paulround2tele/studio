import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectGroup,
  SelectSeparator,
} from '../select';

expect.extend(toHaveNoViolations);

// Mock scrollIntoView which is not available in JSDOM
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true,
});

describe('Select Component Tests', () => {
  const BasicSelect = () => (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
        <SelectItem value="option2">Option 2</SelectItem>
        <SelectItem value="option3">Option 3</SelectItem>
      </SelectContent>
    </Select>
  );

  it('renders select trigger correctly', () => {
    render(<BasicSelect />);
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('displays placeholder text', () => {
    render(<BasicSelect />);
    
    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('has correct data attributes when closed', () => {
    render(<BasicSelect />);
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('data-state', 'closed');
  });
});

describe('SelectTrigger Variants Tests', () => {
  it('renders default variant correctly', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('border-input');
  });

  it('renders destructive variant correctly', () => {
    render(
      <Select>
        <SelectTrigger variant="destructive">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('border-destructive');
  });

  it('renders outline variant correctly', () => {
    render(
      <Select>
        <SelectTrigger variant="outline">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('bg-transparent');
  });

  it('renders secondary variant correctly', () => {
    render(
      <Select>
        <SelectTrigger variant="secondary">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('bg-secondary');
  });

  it('renders ghost variant correctly', () => {
    render(
      <Select>
        <SelectTrigger variant="ghost">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('border-transparent');
  });
});

describe('SelectTrigger Size Tests', () => {
  it('renders default size correctly', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('h-10', 'text-sm');
  });

  it('renders small size correctly', () => {
    render(
      <Select>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('h-8', 'text-xs');
  });

  it('renders large size correctly', () => {
    render(
      <Select>
        <SelectTrigger size="lg">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('h-12', 'text-base');
  });
});

describe('SelectTrigger State Tests', () => {
  it('renders error state correctly', () => {
    render(
      <Select>
        <SelectTrigger error>
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('border-destructive');
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    
    // Check for AlertCircle icon by looking for SVG with specific class
    const alertIcon = document.querySelector('.lucide-circle-alert');
    expect(alertIcon).toBeInTheDocument();
    expect(alertIcon).toHaveClass('text-destructive');
  });

  it('renders success state correctly', () => {
    render(
      <Select>
        <SelectTrigger success>
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('border-green-500');
  });

  it('renders warning state correctly', () => {
    render(
      <Select>
        <SelectTrigger warning>
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('border-yellow-500');
  });
});

describe('SelectTrigger Label and Helper Text Tests', () => {
  it('renders with label', () => {
    render(
      <Select>
        <SelectTrigger label="Choose option">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    expect(screen.getByText('Choose option')).toBeInTheDocument();
    expect(screen.getByLabelText('Choose option')).toBeInTheDocument();
  });

  it('renders with required indicator', () => {
    render(
      <Select>
        <SelectTrigger label="Choose option" required>
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders with helper text', () => {
    render(
      <Select>
        <SelectTrigger helperText="Please select an option">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    expect(screen.getByText('Please select an option')).toBeInTheDocument();
  });

  it('connects helper text with aria-describedby', () => {
    render(
      <Select>
        <SelectTrigger helperText="Please select an option">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    const helperText = screen.getByText('Please select an option');
    
    expect(trigger).toHaveAttribute('aria-describedby', helperText.id);
  });

  it('styles helper text based on state', () => {
    render(
      <Select>
        <SelectTrigger error helperText="Error message">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const helperText = screen.getByText('Error message');
    expect(helperText).toHaveClass('text-destructive');
  });

  it('styles label based on state', () => {
    render(
      <Select>
        <SelectTrigger error label="Error field">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const label = screen.getByText('Error field');
    expect(label).toHaveClass('text-destructive');
  });
});

describe('Select Disabled State', () => {
  it('renders disabled trigger', () => {
    render(
      <Select>
        <SelectTrigger disabled>
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveClass('disabled:opacity-50');
  });
});

describe('Select Accessibility Tests', () => {
  it('has proper ARIA attributes', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports aria-label', () => {
    render(
      <Select>
        <SelectTrigger aria-label="Choose option">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-label', 'Choose option');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Select>
        <SelectTrigger label="Choose option">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Options</SelectLabel>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('generates unique IDs for trigger and helper text', () => {
    render(
      <div>
        <Select>
          <SelectTrigger helperText="Helper 1">
            <SelectValue />
          </SelectTrigger>
        </Select>
        <Select>
          <SelectTrigger helperText="Helper 2">
            <SelectValue />
          </SelectTrigger>
        </Select>
      </div>
    );
    
    const triggers = screen.getAllByRole('combobox');
    const helper1 = screen.getByText('Helper 1');
    const helper2 = screen.getByText('Helper 2');
    
    expect(triggers[0]).toHaveAttribute('aria-describedby', helper1.id);
    expect(triggers[1]).toHaveAttribute('aria-describedby', helper2.id);
    expect(helper1.id).not.toBe(helper2.id);
  });
});

describe('Select Integration Tests', () => {
  it('works with controlled state', () => {
    const onValueChange = jest.fn();
    
    render(
      <Select value="option1" onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    );
    
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  it('works with uncontrolled state', () => {
    const onValueChange = jest.fn();
    
    render(
      <Select defaultValue="option1" onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    );
    
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });
});

describe('Select Component Structure', () => {
  it('renders all select subcomponents without errors', () => {
    render(
      <Select>
        <SelectTrigger label="Test Select" helperText="Choose an option">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Group 1</SelectLabel>
            <SelectItem value="item1">Item 1</SelectItem>
            <SelectItem value="item2">Item 2</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Group 2</SelectLabel>
            <SelectItem value="item3">Item 3</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );
    
    // Basic structure should render without errors
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Test Select')).toBeInTheDocument();
    expect(screen.getByText('Choose an option')).toBeInTheDocument();
    expect(screen.getByText('Select...')).toBeInTheDocument();
  });

  it('properly forwards refs', () => {
    const triggerRef = React.createRef<HTMLButtonElement>();
    
    render(
      <Select>
        <SelectTrigger ref={triggerRef}>
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    expect(triggerRef.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('supports custom className props', () => {
    render(
      <Select>
        <SelectTrigger className="custom-trigger">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('custom-trigger');
  });
});

describe('Select Edge Cases', () => {
  it('handles empty content gracefully', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {/* No items */}
        </SelectContent>
      </Select>
    );
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('handles missing placeholder gracefully', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('data-placeholder');
  });

  it('supports complex helper text with HTML', () => {
    render(
      <Select>
        <SelectTrigger helperText="Please choose from the available options">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    
    expect(screen.getByText('Please choose from the available options')).toBeInTheDocument();
  });
});
