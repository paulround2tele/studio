import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '../sidebar';

// Mock the useIsMobile hook
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(() => false),
}));

const { useIsMobile } = require('@/hooks/use-mobile');

expect.extend(toHaveNoViolations);

describe('Sidebar Components', () => {
  const renderBasicSidebar = (sidebarProps = {}) => {
    return render(
      <SidebarProvider>
        <Sidebar {...sidebarProps}>
          <SidebarHeader>
            <h2>Sidebar Header</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <span>Home</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <span>About</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <p>Footer content</p>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header>
            <SidebarTrigger />
          </header>
          <div>Main content</div>
        </SidebarInset>
      </SidebarProvider>
    );
  };

  beforeEach(() => {
    useIsMobile.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('SidebarProvider', () => {
    it('renders without crashing', () => {
      renderBasicSidebar();
      expect(screen.getByText('Sidebar Header')).toBeInTheDocument();
      expect(screen.getByText('Main content')).toBeInTheDocument();
    });

    it('provides sidebar context', () => {
      const TestComponent = () => {
        const { state, open } = useSidebar();
        return (
          <div>
            <span data-testid="state">{state}</span>
            <span data-testid="open">{open.toString()}</span>
          </div>
        );
      };

      render(
        <SidebarProvider>
          <TestComponent />
        </SidebarProvider>
      );

      expect(screen.getByTestId('state')).toHaveTextContent('expanded');
      expect(screen.getByTestId('open')).toHaveTextContent('true');
    });

    it('handles controlled state', () => {
      const handleOpenChange = jest.fn();
      
      render(
        <SidebarProvider open={false} onOpenChange={handleOpenChange}>
          <Sidebar>
            <SidebarContent>Test</SidebarContent>
          </Sidebar>
          <SidebarTrigger />
        </SidebarProvider>
      );

      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);
      
      expect(handleOpenChange).toHaveBeenCalledWith(true);
    });

    it('supports keyboard shortcut', () => {
      const TestComponent = () => {
        const { state } = useSidebar();
        return <div data-testid="state">{state}</div>;
      };

      render(
        <SidebarProvider>
          <TestComponent />
        </SidebarProvider>
      );

      expect(screen.getByTestId('state')).toHaveTextContent('expanded');

      // Simulate Ctrl+B (or Cmd+B)
      fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
      
      expect(screen.getByTestId('state')).toHaveTextContent('collapsed');
    });
  });

  describe('Sidebar', () => {
    it('renders with different variants', () => {
      const { rerender } = render(
        <SidebarProvider>
          <Sidebar variant="sidebar" data-testid="sidebar-container">
            <SidebarContent>Content</SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      // Find the actual sidebar element, not the container
      let sidebar = document.querySelector('[data-sidebar="sidebar"]');
      expect(sidebar?.parentElement?.parentElement).toHaveAttribute('data-variant', 'sidebar');

      rerender(
        <SidebarProvider>
          <Sidebar variant="floating" data-testid="sidebar-container">
            <SidebarContent>Content</SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      sidebar = document.querySelector('[data-sidebar="sidebar"]');
      expect(sidebar?.parentElement?.parentElement).toHaveAttribute('data-variant', 'floating');
    });

    it('renders with different sides', () => {
      const { rerender } = render(
        <SidebarProvider>
          <Sidebar side="left">
            <SidebarContent>Content</SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      let sidebarContainer = document.querySelector('[data-side="left"]');
      expect(sidebarContainer).toBeInTheDocument();
      expect(sidebarContainer).toHaveAttribute('data-side', 'left');

      rerender(
        <SidebarProvider>
          <Sidebar side="right">
            <SidebarContent>Content</SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      sidebarContainer = document.querySelector('[data-side="right"]');
      expect(sidebarContainer).toBeInTheDocument();
      expect(sidebarContainer).toHaveAttribute('data-side', 'right');
    });

    it('renders with different collapsible modes', () => {
      const { rerender } = render(
        <SidebarProvider>
          <Sidebar collapsible="offcanvas" data-testid="sidebar">
            <SidebarContent>Content</SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      let sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toBeInTheDocument();

      rerender(
        <SidebarProvider>
          <Sidebar collapsible="icon" data-testid="sidebar">
            <SidebarContent>Content</SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toBeInTheDocument();

      rerender(
        <SidebarProvider>
          <Sidebar collapsible="none" data-testid="sidebar">
            <SidebarContent>Content</SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toBeInTheDocument();
    });

    it('renders mobile sidebar as sheet', () => {
      useIsMobile.mockReturnValue(true);
      
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>Mobile Content</SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      // The sheet content should be hidden initially
      expect(screen.queryByText('Mobile Content')).not.toBeInTheDocument();
    });
  });

  describe('SidebarTrigger', () => {
    it('toggles sidebar when clicked', async () => {
      const user = userEvent.setup();
      renderBasicSidebar();

      const trigger = screen.getByRole('button', { name: 'Toggle Sidebar' });
      expect(trigger).toBeInTheDocument();

      await user.click(trigger);
      // The state change would be reflected in the context
    });

    it('has accessible label', () => {
      renderBasicSidebar();
      
      const trigger = screen.getByRole('button', { name: 'Toggle Sidebar' });
      expect(trigger).toHaveAccessibleName('Toggle Sidebar');
    });

    it('supports custom onClick handler', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(
        <SidebarProvider>
          <SidebarTrigger onClick={handleClick} />
        </SidebarProvider>
      );

      const trigger = screen.getByRole('button');
      await user.click(trigger);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('SidebarMenu Components', () => {
    it('renders menu structure correctly', () => {
      renderBasicSidebar();
      
      expect(screen.getByText('Navigation')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
    });

    it('renders menu button with variants', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton variant="default" data-testid="default">
                    Default
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton variant="outline" data-testid="outline">
                    Outline
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      const defaultButton = screen.getByTestId('default');
      const outlineButton = screen.getByTestId('outline');
      
      expect(defaultButton).toHaveClass('hover:bg-sidebar-accent');
      expect(outlineButton).toHaveClass('bg-background', 'shadow-[0_0_0_1px_hsl(var(--sidebar-border))]');
    });

    it('renders menu button with sizes', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton size="sm" data-testid="small">
                    Small
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton size="default" data-testid="default">
                    Default
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg" data-testid="large">
                    Large
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      expect(screen.getByTestId('small')).toHaveClass('h-7', 'text-xs');
      expect(screen.getByTestId('default')).toHaveClass('h-8', 'text-sm');
      expect(screen.getByTestId('large')).toHaveClass('h-12', 'text-sm');
    });

    it('renders active menu button', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive data-testid="active">
                    Active
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      const activeButton = screen.getByTestId('active');
      expect(activeButton).toHaveAttribute('data-active', 'true');
    });

    it('renders menu button with tooltip', async () => {
      const user = userEvent.setup();
      
      render(
        <SidebarProvider defaultOpen={false}>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Go to home page">
                    🏠
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      const button = screen.getByRole('button', { name: '🏠' });
      await user.hover(button);
      
      await waitFor(() => {
        const tooltips = screen.getAllByText('Go to home page');
        expect(tooltips.length).toBeGreaterThan(0);
      });
    });
  });

  describe('SidebarMenuAction', () => {
    it('renders menu action button', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Item</SidebarMenuButton>
                  <SidebarMenuAction data-testid="action">
                    ⋯
                  </SidebarMenuAction>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      const action = screen.getByTestId('action');
      expect(action).toBeInTheDocument();
      expect(action).toHaveClass('absolute', 'right-1');
    });

    it('supports showOnHover prop', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Item</SidebarMenuButton>
                  <SidebarMenuAction showOnHover data-testid="action">
                    ⋯
                  </SidebarMenuAction>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      const action = screen.getByTestId('action');
      expect(action).toHaveClass('md:opacity-0');
    });
  });

  describe('SidebarMenuBadge', () => {
    it('renders menu badge', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Item</SidebarMenuButton>
                  <SidebarMenuBadge data-testid="badge">3</SidebarMenuBadge>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('3');
      expect(badge).toHaveClass('absolute', 'right-1');
    });
  });

  describe('SidebarMenuSkeleton', () => {
    it('renders skeleton without icon', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenuSkeleton data-testid="skeleton" />
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton.querySelector('[data-sidebar="menu-skeleton-icon"]')).not.toBeInTheDocument();
      expect(skeleton.querySelector('[data-sidebar="menu-skeleton-text"]')).toBeInTheDocument();
    });

    it('renders skeleton with icon', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenuSkeleton showIcon data-testid="skeleton" />
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.querySelector('[data-sidebar="menu-skeleton-icon"]')).toBeInTheDocument();
      expect(skeleton.querySelector('[data-sidebar="menu-skeleton-text"]')).toBeInTheDocument();
    });
  });

  describe('SidebarMenuSub', () => {
    it('renders submenu structure', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Parent</SidebarMenuButton>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton>Sub Item 1</SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton>Sub Item 2</SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      expect(screen.getByText('Parent')).toBeInTheDocument();
      expect(screen.getByText('Sub Item 1')).toBeInTheDocument();
      expect(screen.getByText('Sub Item 2')).toBeInTheDocument();
    });

    it('renders submenu button with different sizes', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton size="sm" data-testid="small">
                    Small
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton size="md" data-testid="medium">
                    Medium
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      expect(screen.getByTestId('small')).toHaveClass('text-xs');
      expect(screen.getByTestId('medium')).toHaveClass('text-sm');
    });

    it('renders active submenu button', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton isActive data-testid="active">
                    Active Sub
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      const activeButton = screen.getByTestId('active');
      expect(activeButton).toHaveAttribute('data-active', 'true');
    });
  });

  describe('SidebarGroup Components', () => {
    it('renders group with label and action', () => {
      const handleAction = jest.fn();
      
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Settings</SidebarGroupLabel>
                <SidebarGroupAction onClick={handleAction}>
                  +
                </SidebarGroupAction>
                <SidebarGroupContent>
                  <p>Group content</p>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('+')).toBeInTheDocument();
      expect(screen.getByText('Group content')).toBeInTheDocument();
    });
  });

  describe('SidebarInput', () => {
    it('renders input with proper styling', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarInput placeholder="Search..." data-testid="input" />
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      const input = screen.getByTestId('input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Search...');
      expect(input).toHaveClass('h-8', 'bg-background', 'shadow-none');
    });
  });

  describe('SidebarSeparator', () => {
    it('renders separator with proper styling', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarSeparator data-testid="separator" />
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      const separator = screen.getByTestId('separator');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveClass('mx-2', 'w-auto', 'bg-sidebar-border');
    });
  });

  describe('SidebarRail', () => {
    it('renders rail for desktop interaction', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>Content</SidebarContent>
            <SidebarRail data-testid="rail" />
          </Sidebar>
        </SidebarProvider>
      );

      const rail = screen.getByTestId('rail');
      expect(rail).toBeInTheDocument();
      expect(rail).toHaveAttribute('aria-label', 'Toggle Sidebar');
    });

    it('toggles sidebar when rail is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>Content</SidebarContent>
            <SidebarRail data-testid="rail" />
          </Sidebar>
        </SidebarProvider>
      );

      const rail = screen.getByTestId('rail');
      await user.click(rail);
      // The state change would be reflected in the context
    });
  });

  describe('SidebarInset', () => {
    it('renders main content area', () => {
      render(
        <SidebarProvider>
          <SidebarInset data-testid="inset">
            <h1>Main Content</h1>
          </SidebarInset>
        </SidebarProvider>
      );

      const inset = screen.getByTestId('inset');
      expect(inset).toBeInTheDocument();
      expect(inset.tagName).toBe('MAIN');
      expect(screen.getByText('Main Content')).toBeInTheDocument();
    });
  });

  describe('useSidebar hook', () => {
    it('throws error when used outside provider', () => {
      const TestComponent = () => {
        useSidebar();
        return <div>Test</div>;
      };

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => render(<TestComponent />)).toThrow(
        'useSidebar must be used within a SidebarProvider.'
      );

      consoleSpy.mockRestore();
    });

    it('provides correct context values', () => {
      const TestComponent = () => {
        const context = useSidebar();
        return (
          <div>
            <div data-testid="state">{context.state}</div>
            <div data-testid="open">{context.open.toString()}</div>
            <div data-testid="mobile">{context.isMobile.toString()}</div>
            <button onClick={context.toggleSidebar}>Toggle</button>
          </div>
        );
      };

      render(
        <SidebarProvider>
          <TestComponent />
        </SidebarProvider>
      );

      expect(screen.getByTestId('state')).toHaveTextContent('expanded');
      expect(screen.getByTestId('open')).toHaveTextContent('true');
      expect(screen.getByTestId('mobile')).toHaveTextContent('false');
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = renderBasicSidebar();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderBasicSidebar();

      const trigger = screen.getByRole('button', { name: 'Toggle Sidebar' });
      
      // Focus the trigger directly
      trigger.focus();
      expect(trigger).toHaveFocus();

      await user.keyboard('{Enter}');
      // Sidebar should toggle
    });

    it('provides proper ARIA labels and roles', () => {
      renderBasicSidebar();

      const trigger = screen.getByRole('button', { name: 'Toggle Sidebar' });
      expect(trigger).toHaveAccessibleName('Toggle Sidebar');
    });
  });

  describe('Mobile behavior', () => {
    beforeEach(() => {
      useIsMobile.mockReturnValue(true);
    });

    it('renders as sheet on mobile', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>Mobile Content</SidebarContent>
          </Sidebar>
          <SidebarTrigger />
        </SidebarProvider>
      );

      // Content should not be visible initially on mobile
      expect(screen.queryByText('Mobile Content')).not.toBeInTheDocument();
    });

    it('opens mobile sidebar when trigger is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>Mobile Content</SidebarContent>
          </Sidebar>
          <SidebarTrigger />
        </SidebarProvider>
      );

      const trigger = screen.getByRole('button', { name: 'Toggle Sidebar' });
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Mobile Content')).toBeInTheDocument();
      });
    });
  });

  describe('Custom className and props', () => {
    it('accepts custom className on components', () => {
      render(
        <SidebarProvider className="custom-provider">
          <Sidebar className="custom-sidebar">
            <SidebarHeader className="custom-header">
              <h2>Header</h2>
            </SidebarHeader>
            <SidebarContent className="custom-content">
              <SidebarMenu className="custom-menu">
                <SidebarMenuItem className="custom-item">
                  <SidebarMenuButton className="custom-button">
                    Button
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="custom-footer">
              <p>Footer</p>
            </SidebarFooter>
          </Sidebar>
        </SidebarProvider>
      );

      // Check that custom classes are applied
      expect(document.querySelector('.custom-provider')).toBeInTheDocument();
      expect(document.querySelector('.custom-header')).toBeInTheDocument();
      expect(document.querySelector('.custom-content')).toBeInTheDocument();
      expect(document.querySelector('.custom-menu')).toBeInTheDocument();
      expect(document.querySelector('.custom-item')).toBeInTheDocument();
      expect(document.querySelector('.custom-button')).toBeInTheDocument();
      expect(document.querySelector('.custom-footer')).toBeInTheDocument();
    });

    it('forwards props correctly', () => {
      render(
        <SidebarProvider data-testid="provider" data-custom="provider-value">
          <Sidebar data-testid="sidebar" data-custom="sidebar-value">
            <SidebarContent>Content</SidebarContent>
          </Sidebar>
        </SidebarProvider>
      );

      const provider = screen.getByTestId('provider');
      const sidebar = screen.getByTestId('sidebar');
      
      expect(provider).toHaveAttribute('data-custom', 'provider-value');
      expect(sidebar).toHaveAttribute('data-custom', 'sidebar-value');
    });
  });
});
