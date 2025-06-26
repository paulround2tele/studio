import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../card';

expect.extend(toHaveNoViolations);

describe('Card Component Tests', () => {
  it('renders card correctly', () => {
    render(
      <Card data-testid="card">
        <CardContent>Test content</CardContent>
      </Card>
    );
    
    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent('Test content');
  });

  it('has correct default classes', () => {
    render(<Card data-testid="card" />);
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('rounded-lg');
    expect(card).toHaveClass('bg-card');
    expect(card).toHaveClass('text-card-foreground');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('shadow-sm');
  });

  it('accepts custom className', () => {
    render(<Card className="custom-class" data-testid="card" />);
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Card ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('Card Variant Tests', () => {
  it('renders default variant correctly', () => {
    render(<Card variant="default" data-testid="card" />);
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('bg-card');
    expect(card).toHaveClass('shadow-sm');
  });

  it('renders elevated variant correctly', () => {
    render(<Card variant="elevated" data-testid="card" />);
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('bg-card');
    expect(card).toHaveClass('shadow-md');
    expect(card).toHaveClass('hover:shadow-lg');
    expect(card).not.toHaveClass('border');
  });

  it('renders outlined variant correctly', () => {
    render(<Card variant="outlined" data-testid="card" />);
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('border-2');
    expect(card).toHaveClass('bg-transparent');
  });

  it('renders filled variant correctly', () => {
    render(<Card variant="filled" data-testid="card" />);
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('bg-muted');
    expect(card).toHaveClass('border-0');
  });

  it('renders ghost variant correctly', () => {
    render(<Card variant="ghost" data-testid="card" />);
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('bg-transparent');
    expect(card).toHaveClass('border-0');
    expect(card).toHaveClass('shadow-none');
  });
});

describe('Card Size Tests', () => {
  it('renders compact size correctly with CardHeader', () => {
    render(
      <Card size="compact">
        <CardHeader size="compact" data-testid="header">
          <CardTitle size="compact">Title</CardTitle>
        </CardHeader>
      </Card>
    );
    
    const header = screen.getByTestId('header');
    const title = screen.getByText('Title');
    
    expect(header).toHaveClass('p-4');
    expect(title).toHaveClass('text-lg');
  });

  it('renders default size correctly with CardContent', () => {
    render(
      <Card size="default">
        <CardContent size="default" data-testid="content">
          Content
        </CardContent>
      </Card>
    );
    
    const content = screen.getByTestId('content');
    expect(content).toHaveClass('p-6');
  });

  it('renders spacious size correctly with CardFooter', () => {
    render(
      <Card size="spacious">
        <CardFooter size="spacious" data-testid="footer">
          Footer
        </CardFooter>
      </Card>
    );
    
    const footer = screen.getByTestId('footer');
    expect(footer).toHaveClass('p-8');
  });
});

describe('Card Interactive Tests', () => {
  it('renders interactive card correctly', () => {
    render(<Card interactive data-testid="card" />);
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('cursor-pointer');
    expect(card).toHaveClass('hover:bg-accent/50');
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('tabIndex', '0');
  });

  it('handles click events when interactive', () => {
    const handleClick = jest.fn();
    render(<Card interactive onClick={handleClick} data-testid="card" />);
    
    const card = screen.getByTestId('card');
    fireEvent.click(card);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('handles keyboard events when interactive', () => {
    const handleKeyDown = jest.fn();
    render(<Card interactive onKeyDown={handleKeyDown} data-testid="card" />);
    
    const card = screen.getByTestId('card');
    fireEvent.keyDown(card, { key: 'Enter' });
    
    expect(handleKeyDown).toHaveBeenCalledTimes(1);
  });

  it('does not have interactive attributes when not interactive', () => {
    render(<Card data-testid="card" />);
    
    const card = screen.getByTestId('card');
    expect(card).not.toHaveAttribute('role', 'button');
    expect(card).not.toHaveAttribute('tabIndex');
  });
});

describe('Card State Tests', () => {
  it('renders disabled state correctly', () => {
    render(<Card state="disabled" data-testid="card" />);
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('opacity-50');
    expect(card).toHaveClass('cursor-not-allowed');
  });

  it('renders selected state correctly', () => {
    render(<Card state="selected" data-testid="card" />);
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('ring-2');
    expect(card).toHaveClass('ring-ring');
    expect(card).toHaveClass('ring-offset-2');
  });

  it('disables interaction when disabled', () => {
    render(<Card interactive state="disabled" data-testid="card" />);
    
    const card = screen.getByTestId('card');
    expect(card).not.toHaveAttribute('tabIndex', '0');
    expect(card).toHaveClass('cursor-not-allowed');
  });
});

describe('CardHeader Tests', () => {
  it('renders header with correct default classes', () => {
    render(<CardHeader data-testid="header">Header content</CardHeader>);
    
    const header = screen.getByTestId('header');
    expect(header).toHaveClass('flex');
    expect(header).toHaveClass('flex-col');
    expect(header).toHaveClass('space-y-1.5');
    expect(header).toHaveClass('p-6');
  });

  it('renders header with different sizes', () => {
    const { rerender } = render(<CardHeader size="compact" data-testid="header" />);
    expect(screen.getByTestId('header')).toHaveClass('p-4');

    rerender(<CardHeader size="spacious" data-testid="header" />);
    expect(screen.getByTestId('header')).toHaveClass('p-8');
  });
});

describe('CardTitle Tests', () => {
  it('renders title with correct default element and classes', () => {
    render(<CardTitle>Card Title</CardTitle>);
    
    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('font-semibold');
    expect(title).toHaveClass('tracking-tight');
    expect(title).toHaveClass('text-2xl');
  });

  it('renders title with different heading levels', () => {
    render(<CardTitle as="h1">H1 Title</CardTitle>);
    
    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('H1 Title');
  });

  it('renders title with different sizes', () => {
    const { rerender } = render(<CardTitle size="compact" data-testid="title">Title</CardTitle>);
    expect(screen.getByTestId('title')).toHaveClass('text-lg');

    rerender(<CardTitle size="spacious" data-testid="title">Title</CardTitle>);
    expect(screen.getByTestId('title')).toHaveClass('text-3xl');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLHeadingElement>();
    render(<CardTitle ref={ref}>Title</CardTitle>);
    
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });
});

describe('CardDescription Tests', () => {
  it('renders description with correct element and classes', () => {
    render(<CardDescription>Card description text</CardDescription>);
    
    const description = screen.getByText('Card description text');
    expect(description.tagName).toBe('P');
    expect(description).toHaveClass('text-sm');
    expect(description).toHaveClass('text-muted-foreground');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLParagraphElement>();
    render(<CardDescription ref={ref}>Description</CardDescription>);
    
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });
});

describe('CardContent Tests', () => {
  it('renders content with correct default classes', () => {
    render(<CardContent data-testid="content">Content</CardContent>);
    
    const content = screen.getByTestId('content');
    expect(content).toHaveClass('pt-0');
    expect(content).toHaveClass('p-6');
  });

  it('renders content with different sizes', () => {
    const { rerender } = render(<CardContent size="compact" data-testid="content" />);
    expect(screen.getByTestId('content')).toHaveClass('p-4');

    rerender(<CardContent size="spacious" data-testid="content" />);
    expect(screen.getByTestId('content')).toHaveClass('p-8');
  });
});

describe('CardFooter Tests', () => {
  it('renders footer with correct default classes', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>);
    
    const footer = screen.getByTestId('footer');
    expect(footer).toHaveClass('flex');
    expect(footer).toHaveClass('items-center');
    expect(footer).toHaveClass('pt-0');
    expect(footer).toHaveClass('p-6');
  });

  it('renders footer with different sizes', () => {
    const { rerender } = render(<CardFooter size="compact" data-testid="footer" />);
    expect(screen.getByTestId('footer')).toHaveClass('p-4');

    rerender(<CardFooter size="spacious" data-testid="footer" />);
    expect(screen.getByTestId('footer')).toHaveClass('p-8');
  });
});

describe('Card Complete Structure Tests', () => {
  it('renders complete card structure correctly', () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="header">
          <CardTitle>Test Card</CardTitle>
          <CardDescription>This is a test card description</CardDescription>
        </CardHeader>
        <CardContent data-testid="content">
          <p>This is the card content</p>
        </CardContent>
        <CardFooter data-testid="footer">
          <button>Action</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Test Card' })).toBeInTheDocument();
    expect(screen.getByText('This is a test card description')).toBeInTheDocument();
    expect(screen.getByText('This is the card content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('maintains proper hierarchy and structure', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );

    const card = screen.getByTestId('card');
    const title = screen.getByRole('heading');
    const description = screen.getByText('Card Description');
    const content = screen.getByText('Content');
    const footer = screen.getByText('Footer');

    // Check that all elements are within the card
    expect(card).toContainElement(title);
    expect(card).toContainElement(description);
    expect(card).toContainElement(content);
    expect(card).toContainElement(footer);
  });
});

describe('Card Accessibility Tests', () => {
  it('has no accessibility violations (basic card)', async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Accessible Card</CardTitle>
          <CardDescription>This card is accessible</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content here</p>
        </CardContent>
      </Card>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations (interactive card)', async () => {
    const { container } = render(
      <Card interactive aria-label="Interactive card">
        <CardHeader>
          <CardTitle>Interactive Card</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This card is interactive</p>
        </CardContent>
      </Card>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('supports aria-label for interactive cards', () => {
    render(
      <Card 
        interactive 
        aria-label="Custom card label" 
        data-testid="card"
      />
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('aria-label', 'Custom card label');
  });

  it('supports aria-describedby', () => {
    render(
      <div>
        <Card aria-describedby="card-desc" data-testid="card" />
        <p id="card-desc">Card description</p>
      </div>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('aria-describedby', 'card-desc');
  });
});

describe('Card Edge Cases', () => {
  it('handles empty card gracefully', () => {
    render(<Card data-testid="card" />);
    
    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();
    expect(card).toBeEmptyDOMElement();
  });

  it('handles card with only header', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Only Header</CardTitle>
        </CardHeader>
      </Card>
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Only Header' })).toBeInTheDocument();
  });

  it('handles card with only content', () => {
    render(
      <Card data-testid="card">
        <CardContent>Only content</CardContent>
      </Card>
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByText('Only content')).toBeInTheDocument();
  });

  it('handles complex nested content', () => {
    render(
      <Card data-testid="card">
        <CardContent>
          <div>
            <span>Nested</span>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByText('Nested')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('works with all size combinations', () => {
    render(
      <Card size="compact">
        <CardHeader size="compact">
          <CardTitle size="compact">Compact</CardTitle>
        </CardHeader>
        <CardContent size="compact">Content</CardContent>
        <CardFooter size="compact">Footer</CardFooter>
      </Card>
    );

    expect(screen.getByRole('heading')).toHaveClass('text-lg');
  });
});
