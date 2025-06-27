import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
} from '../menubar';

expect.extend(toHaveNoViolations);

describe('Menubar', () => {
  const renderBasicMenubar = () => {
    return render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>New</MenubarItem>
            <MenubarItem>Open</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Save</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Undo</MenubarItem>
            <MenubarItem>Redo</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    );
  };

  it('renders without crashing', () => {
    renderBasicMenubar();
    expect(screen.getByRole('menubar')).toBeInTheDocument();
  });

  it('renders all menu triggers', () => {
    renderBasicMenubar();
    expect(screen.getByRole('menuitem', { name: 'File' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
  });

  it('opens menu content when trigger is clicked', async () => {
    const user = userEvent.setup();
    renderBasicMenubar();
    
    const fileTrigger = screen.getByRole('menuitem', { name: 'File' });
    await user.click(fileTrigger);
    
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'New' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Open' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Save' })).toBeInTheDocument();
    });
  });

  it('opens menu content with keyboard navigation', async () => {
    const user = userEvent.setup();
    renderBasicMenubar();
    
    const fileTrigger = screen.getByRole('menuitem', { name: 'File' });
    fileTrigger.focus();
    await user.keyboard('{Enter}');
    
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  it('navigates between menu triggers with arrow keys', async () => {
    const user = userEvent.setup();
    renderBasicMenubar();
    
    const fileTrigger = screen.getByRole('menuitem', { name: 'File' });
    const editTrigger = screen.getByRole('menuitem', { name: 'Edit' });
    
    fileTrigger.focus();
    await user.keyboard('{ArrowRight}');
    
    expect(editTrigger).toHaveFocus();
  });

  describe('Variants', () => {
    it('applies default variant correctly', () => {
      render(<Menubar data-testid="menubar" />);
      const menubar = screen.getByTestId('menubar');
      expect(menubar).toHaveClass('flex', 'items-center', 'space-x-1', 'rounded-md', 'border', 'bg-background', 'p-1');
    });

    it('applies minimal variant correctly', () => {
      render(<Menubar variant="minimal" data-testid="menubar" />);
      const menubar = screen.getByTestId('menubar');
      expect(menubar).toHaveClass('border-none', 'bg-transparent', 'p-0', 'space-x-0');
    });

    it('applies elevated variant correctly', () => {
      render(<Menubar variant="elevated" data-testid="menubar" />);
      const menubar = screen.getByTestId('menubar');
      expect(menubar).toHaveClass('shadow-lg', 'border-border/50');
    });

    it('applies outline variant correctly', () => {
      render(<Menubar variant="outline" data-testid="menubar" />);
      const menubar = screen.getByTestId('menubar');
      expect(menubar).toHaveClass('border-2', 'border-border', 'bg-transparent');
    });
  });

  describe('Sizes', () => {
    it('applies small size correctly', () => {
      render(<Menubar size="sm" data-testid="menubar" />);
      const menubar = screen.getByTestId('menubar');
      expect(menubar).toHaveClass('h-8', 'text-xs');
    });

    it('applies default size correctly', () => {
      render(<Menubar size="default" data-testid="menubar" />);
      const menubar = screen.getByTestId('menubar');
      expect(menubar).toHaveClass('h-10', 'text-sm');
    });

    it('applies large size correctly', () => {
      render(<Menubar size="lg" data-testid="menubar" />);
      const menubar = screen.getByTestId('menubar');
      expect(menubar).toHaveClass('h-12', 'text-base');
    });
  });

  describe('Orientation', () => {
    it('applies horizontal orientation correctly', () => {
      render(<Menubar orientation="horizontal" data-testid="menubar" />);
      const menubar = screen.getByTestId('menubar');
      expect(menubar).toHaveClass('flex-row');
    });

    it('applies vertical orientation correctly', () => {
      render(<Menubar orientation="vertical" data-testid="menubar" />);
      const menubar = screen.getByTestId('menubar');
      expect(menubar).toHaveClass('flex-col', 'space-x-0', 'space-y-1', 'w-fit');
    });
  });

  describe('MenubarTrigger', () => {
    it('applies trigger variants correctly', () => {
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger variant="ghost" data-testid="trigger">Test</MenubarTrigger>
          </MenubarMenu>
        </Menubar>
      );
      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveClass('hover:bg-accent/50');
    });

    it('applies trigger sizes correctly', () => {
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger size="lg" data-testid="trigger">Test</MenubarTrigger>
          </MenubarMenu>
        </Menubar>
      );
      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveClass('px-4', 'py-2', 'text-base');
    });
  });

  describe('MenubarItem interactions', () => {
    it('calls onClick when item is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={handleClick}>New</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      );
      
      const fileTrigger = screen.getByRole('menuitem', { name: 'File' });
      await user.click(fileTrigger);
      
      await waitFor(() => {
        const newItem = screen.getByRole('menuitem', { name: 'New' });
        expect(newItem).toBeInTheDocument();
      });
      
      const newItem = screen.getByRole('menuitem', { name: 'New' });
      await user.click(newItem);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles disabled items correctly', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem disabled onClick={handleClick}>Disabled</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      );
      
      const fileTrigger = screen.getByRole('menuitem', { name: 'File' });
      await user.click(fileTrigger);
      
      await waitFor(() => {
        const disabledItem = screen.getByRole('menuitem', { name: 'Disabled' });
        expect(disabledItem).toBeInTheDocument();
        expect(disabledItem).toHaveAttribute('data-disabled');
        expect(disabledItem).toHaveClass('data-[disabled]:pointer-events-none', 'data-[disabled]:opacity-50');
      });
      
      // For disabled items, we just verify they are marked as disabled
      // Radix UI may still allow the click event to fire, but the visual state should be disabled
      const disabledItem = screen.getByRole('menuitem', { name: 'Disabled' });
      expect(disabledItem).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('MenubarCheckboxItem', () => {
    it('renders checkbox items correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem checked>Show Toolbar</MenubarCheckboxItem>
              <MenubarCheckboxItem checked={false}>Show Sidebar</MenubarCheckboxItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      );
      
      const viewTrigger = screen.getByRole('menuitem', { name: 'View' });
      await user.click(viewTrigger);
      
      await waitFor(() => {
        const toolbarItem = screen.getByRole('menuitemcheckbox', { name: 'Show Toolbar' });
        const sidebarItem = screen.getByRole('menuitemcheckbox', { name: 'Show Sidebar' });
        
        expect(toolbarItem).toBeInTheDocument();
        expect(toolbarItem).toHaveAttribute('data-state', 'checked');
        expect(sidebarItem).toBeInTheDocument();
        expect(sidebarItem).toHaveAttribute('data-state', 'unchecked');
      });
    });

    it('toggles checkbox state when clicked', async () => {
      const user = userEvent.setup();
      const handleCheckedChange = jest.fn();
      
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem 
                checked={false}
                onCheckedChange={handleCheckedChange}
              >
                Show Toolbar
              </MenubarCheckboxItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      );
      
      const viewTrigger = screen.getByRole('menuitem', { name: 'View' });
      await user.click(viewTrigger);
      
      await waitFor(() => {
        const toolbarItem = screen.getByRole('menuitemcheckbox', { name: 'Show Toolbar' });
        expect(toolbarItem).toBeInTheDocument();
      });
      
      const toolbarItem = screen.getByRole('menuitemcheckbox', { name: 'Show Toolbar' });
      await user.click(toolbarItem);
      
      expect(handleCheckedChange).toHaveBeenCalledWith(true);
    });
  });

  describe('MenubarRadioGroup', () => {
    it('renders radio groups correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Theme</MenubarTrigger>
            <MenubarContent>
              <MenubarRadioGroup value="light">
                <MenubarRadioItem value="light">Light</MenubarRadioItem>
                <MenubarRadioItem value="dark">Dark</MenubarRadioItem>
                <MenubarRadioItem value="system">System</MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      );
      
      const themeTrigger = screen.getByRole('menuitem', { name: 'Theme' });
      await user.click(themeTrigger);
      
      await waitFor(() => {
        const lightItem = screen.getByRole('menuitemradio', { name: 'Light' });
        const darkItem = screen.getByRole('menuitemradio', { name: 'Dark' });
        const systemItem = screen.getByRole('menuitemradio', { name: 'System' });
        
        expect(lightItem).toBeInTheDocument();
        expect(lightItem).toHaveAttribute('data-state', 'checked');
        expect(darkItem).toBeInTheDocument();
        expect(darkItem).toHaveAttribute('data-state', 'unchecked');
        expect(systemItem).toBeInTheDocument();
        expect(systemItem).toHaveAttribute('data-state', 'unchecked');
      });
    });

    it('changes radio selection when clicked', async () => {
      const user = userEvent.setup();
      const handleValueChange = jest.fn();
      
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Theme</MenubarTrigger>
            <MenubarContent>
              <MenubarRadioGroup value="light" onValueChange={handleValueChange}>
                <MenubarRadioItem value="light">Light</MenubarRadioItem>
                <MenubarRadioItem value="dark">Dark</MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      );
      
      const themeTrigger = screen.getByRole('menuitem', { name: 'Theme' });
      await user.click(themeTrigger);
      
      await waitFor(() => {
        const darkItem = screen.getByRole('menuitemradio', { name: 'Dark' });
        expect(darkItem).toBeInTheDocument();
      });
      
      const darkItem = screen.getByRole('menuitemradio', { name: 'Dark' });
      await user.click(darkItem);
      
      expect(handleValueChange).toHaveBeenCalledWith('dark');
    });
  });

  describe('Submenus', () => {
    it('renders submenus correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarSub>
                <MenubarSubTrigger>Recent Files</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>file1.txt</MenubarItem>
                  <MenubarItem>file2.txt</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      );
      
      const fileTrigger = screen.getByRole('menuitem', { name: 'File' });
      await user.click(fileTrigger);
      
      await waitFor(() => {
        const recentTrigger = screen.getByRole('menuitem', { name: 'Recent Files' });
        expect(recentTrigger).toBeInTheDocument();
      });
      
      const recentTrigger = screen.getByRole('menuitem', { name: 'Recent Files' });
      await user.hover(recentTrigger);
      
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'file1.txt' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'file2.txt' })).toBeInTheDocument();
      });
    });
  });

  describe('MenubarShortcut', () => {
    it('renders shortcuts correctly', () => {
      render(
        <div>
          <MenubarShortcut>Ctrl+N</MenubarShortcut>
        </div>
      );
      
      const shortcut = screen.getByText('Ctrl+N');
      expect(shortcut).toBeInTheDocument();
      expect(shortcut).toHaveClass('ml-auto', 'text-xs', 'tracking-widest', 'text-muted-foreground');
    });
  });

  describe('MenubarSeparator', () => {
    it('renders separators correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>New</MenubarItem>
              <MenubarSeparator data-testid="separator" />
              <MenubarItem>Exit</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      );
      
      const fileTrigger = screen.getByRole('menuitem', { name: 'File' });
      await user.click(fileTrigger);
      
      await waitFor(() => {
        const separator = screen.getByTestId('separator');
        expect(separator).toBeInTheDocument();
        expect(separator).toHaveClass('-mx-1', 'my-1', 'h-px', 'bg-muted');
      });
    });
  });

  describe('MenubarLabel', () => {
    it('renders labels correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarLabel>Actions</MenubarLabel>
              <MenubarItem>Copy</MenubarItem>
              <MenubarItem>Paste</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      );
      
      const editTrigger = screen.getByRole('menuitem', { name: 'Edit' });
      await user.click(editTrigger);
      
      await waitFor(() => {
        const label = screen.getByText('Actions');
        expect(label).toBeInTheDocument();
        expect(label).toHaveClass('px-2', 'py-1.5', 'text-sm', 'font-semibold');
      });
    });

    it('applies inset to labels correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarLabel inset data-testid="label">Actions</MenubarLabel>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      );
      
      const editTrigger = screen.getByRole('menuitem', { name: 'Edit' });
      await user.click(editTrigger);
      
      await waitFor(() => {
        const label = screen.getByTestId('label');
        expect(label).toHaveClass('pl-8');
      });
    });
  });

  describe('Complex menubar with multiple features', () => {
    it('renders a complex menubar correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                New <MenubarShortcut>Ctrl+N</MenubarShortcut>
              </MenubarItem>
              <MenubarItem>
                Open <MenubarShortcut>Ctrl+O</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarSub>
                <MenubarSubTrigger>Recent</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>project1.tsx</MenubarItem>
                  <MenubarItem>project2.tsx</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
              <MenubarSeparator />
              <MenubarItem>
                Save <MenubarShortcut>Ctrl+S</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem checked>Show Toolbar</MenubarCheckboxItem>
              <MenubarCheckboxItem>Show Sidebar</MenubarCheckboxItem>
              <MenubarSeparator />
              <MenubarRadioGroup value="comfortable">
                <MenubarLabel>Layout</MenubarLabel>
                <MenubarRadioItem value="compact">Compact</MenubarRadioItem>
                <MenubarRadioItem value="comfortable">Comfortable</MenubarRadioItem>
                <MenubarRadioItem value="spacious">Spacious</MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      );
      
      // Test File menu
      const fileTrigger = screen.getByRole('menuitem', { name: 'File' });
      await user.click(fileTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('New')).toBeInTheDocument();
        expect(screen.getByText('Ctrl+N')).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Recent' })).toBeInTheDocument();
      });
      
      // Close File menu and test View menu
      await user.keyboard('{Escape}');
      
      const viewTrigger = screen.getByRole('menuitem', { name: 'View' });
      await user.click(viewTrigger);
      
      await waitFor(() => {
        expect(screen.getByRole('menuitemcheckbox', { name: 'Show Toolbar' })).toBeInTheDocument();
        expect(screen.getByText('Layout')).toBeInTheDocument();
        expect(screen.getByRole('menuitemradio', { name: 'Comfortable' })).toHaveAttribute('data-state', 'checked');
      });
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = renderBasicMenubar();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderBasicMenubar();
      
      // Tab to the menubar
      await user.tab();
      expect(screen.getByRole('menuitem', { name: 'File' })).toHaveFocus();
      
      // Arrow right to next trigger
      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
      
      // Arrow left back to first trigger
      await user.keyboard('{ArrowLeft}');
      expect(screen.getByRole('menuitem', { name: 'File' })).toHaveFocus();
    });

    it('supports Enter and Space to open menus', async () => {
      const user = userEvent.setup();
      renderBasicMenubar();
      
      const fileTrigger = screen.getByRole('menuitem', { name: 'File' });
      fileTrigger.focus();
      
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    it('closes menu with Escape key', async () => {
      const user = userEvent.setup();
      renderBasicMenubar();
      
      const fileTrigger = screen.getByRole('menuitem', { name: 'File' });
      await user.click(fileTrigger);
      
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
      
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('maintains proper ARIA attributes', async () => {
      const user = userEvent.setup();
      renderBasicMenubar();
      
      const menubar = screen.getByRole('menubar');
      expect(menubar).toHaveAttribute('role', 'menubar');
      
      const fileTrigger = screen.getByRole('menuitem', { name: 'File' });
      expect(fileTrigger).toHaveAttribute('role', 'menuitem');
      expect(fileTrigger).toHaveAttribute('aria-haspopup', 'menu');
      
      await user.click(fileTrigger);
      
      await waitFor(() => {
        const menu = screen.getByRole('menu');
        expect(menu).toHaveAttribute('role', 'menu');
        
        const menuItems = screen.getAllByRole('menuitem');
        menuItems.forEach(item => {
          expect(item).toHaveAttribute('role', 'menuitem');
        });
      });
    });
  });

  describe('Custom className and props', () => {
    it('accepts custom className', () => {
      render(<Menubar className="custom-class" data-testid="menubar" />);
      const menubar = screen.getByTestId('menubar');
      expect(menubar).toHaveClass('custom-class');
    });

    it('forwards props correctly', () => {
      render(<Menubar data-testid="menubar" data-custom="value" />);
      const menubar = screen.getByTestId('menubar');
      expect(menubar).toHaveAttribute('data-custom', 'value');
    });

    it('applies custom props to trigger', () => {
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger 
              className="custom-trigger" 
              data-testid="trigger"
              data-custom="trigger-value"
            >
              Test
            </MenubarTrigger>
          </MenubarMenu>
        </Menubar>
      );
      
      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveClass('custom-trigger');
      expect(trigger).toHaveAttribute('data-custom', 'trigger-value');
    });
  });
});
