import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import '@testing-library/jest-dom'

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from '../dropdown-menu'
import { Button } from '../button'

expect.extend(toHaveNoViolations)

// Mock IntersectionObserver for JSDOM
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('DropdownMenu', () => {
  const TestDropdownMenu = ({ 
    contentVariant = 'default',
    contentSize = 'default',
    itemVariant = 'default',
    itemSize = 'default',
    ...props 
  }: any) => (
    <DropdownMenu {...props}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Open menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent variant={contentVariant} size={contentSize}>
        <DropdownMenuLabel size={itemSize}>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant={itemVariant} size={itemSize}>
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem variant={itemVariant} size={itemSize}>
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant={itemVariant} size={itemSize} disabled>
          Disabled Item
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const TestCheckboxDropdown = ({ itemSize = 'default' }: any) => {
    const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>({
      item1: false,
      item2: true,
    })

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Checkbox menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem
            size={itemSize}
            checked={checkedItems.item1}
            onCheckedChange={(checked) => 
              setCheckedItems(prev => ({ ...prev, item1: !!checked }))
            }
          >
            Item 1
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            size={itemSize}
            checked={checkedItems.item2}
            onCheckedChange={(checked) => 
              setCheckedItems(prev => ({ ...prev, item2: !!checked }))
            }
          >
            Item 2
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const TestRadioDropdown = ({ itemSize = 'default' }: any) => {
    const [value, setValue] = React.useState('option1')

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Radio menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value={value} onValueChange={setValue}>
            <DropdownMenuRadioItem size={itemSize} value="option1">
              Option 1
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem size={itemSize} value="option2">
              Option 2
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem size={itemSize} value="option3">
              Option 3
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const TestSubMenuDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Sub menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Item 1</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Sub menu</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Sub item 1</DropdownMenuItem>
            <DropdownMenuItem>Sub item 2</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem>Item 2</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  describe('Rendering', () => {
    it('renders trigger correctly', () => {
      render(<TestDropdownMenu />)
      
      expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
    })

    it('opens dropdown menu when trigger is clicked', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu />)
      
      const trigger = screen.getByRole('button', { name: 'Open menu' })
      await user.click(trigger)
      
      await waitFor(() => {
        expect(screen.getByText('Actions')).toBeInTheDocument()
        expect(screen.getByText('Profile')).toBeInTheDocument()
        expect(screen.getByText('Settings')).toBeInTheDocument()
      })
    })

    it('closes dropdown menu with Escape key', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <TestDropdownMenu />
          <div data-testid="outside">Outside element</div>
        </div>
      )
      
      const trigger = screen.getByRole('button', { name: 'Open menu' })
      await user.click(trigger)
      
      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument()
      })
      
      // Use Escape key instead of clicking outside due to pointer-events limitations in JSDOM
      await user.keyboard('{Escape}')
      
      await waitFor(() => {
        expect(screen.queryByText('Profile')).not.toBeInTheDocument()
      })
    })

    it('renders with custom className', async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>Open</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="custom-dropdown">
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        const content = screen.getByRole('menu')
        expect(content).toHaveClass('custom-dropdown')
      })
    })
  })

  describe('Content Variants', () => {
    it('applies default variant classes', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu contentVariant="default" />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        const content = screen.getByRole('menu')
        expect(content).toHaveClass('shadow-md')
      })
    })

    it('applies elevated variant classes', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu contentVariant="elevated" />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        const content = screen.getByRole('menu')
        expect(content).toHaveClass('shadow-lg')
      })
    })

    it('applies flat variant classes', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu contentVariant="flat" />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        const content = screen.getByRole('menu')
        expect(content).toHaveClass('shadow-none', 'border-0')
      })
    })

    it('applies minimal variant classes', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu contentVariant="minimal" />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        const content = screen.getByRole('menu')
        expect(content).toHaveClass('bg-background', 'border-border', 'shadow-sm')
      })
    })
  })

  describe('Content Sizes', () => {
    it('applies small size classes', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu contentSize="sm" />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        const content = screen.getByRole('menu')
        expect(content).toHaveClass('min-w-[6rem]', 'text-xs')
      })
    })

    it('applies default size classes', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu contentSize="default" />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        const content = screen.getByRole('menu')
        expect(content).toHaveClass('min-w-[8rem]', 'text-sm')
      })
    })

    it('applies large size classes', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu contentSize="lg" />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        const content = screen.getByRole('menu')
        expect(content).toHaveClass('min-w-[12rem]', 'text-base')
      })
    })
  })

  describe('Item Variants', () => {
    it('applies default item variant classes', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu itemVariant="default" />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        const item = screen.getByRole('menuitem', { name: 'Profile' })
        expect(item).toHaveClass('focus:bg-accent')
        expect(item).not.toHaveClass('text-destructive')
      })
    })

    it('applies destructive item variant classes', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu itemVariant="destructive" />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        const item = screen.getByRole('menuitem', { name: 'Profile' })
        expect(item).toHaveClass('focus:bg-destructive', 'focus:text-destructive-foreground', 'text-destructive')
      })
    })

    it('applies ghost item variant classes', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu itemVariant="ghost" />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        const item = screen.getByRole('menuitem', { name: 'Profile' })
        expect(item).toHaveClass('hover:bg-accent/50')
      })
    })
  })

  describe('Item Sizes', () => {
    it('applies small item size classes', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu itemSize="sm" />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        const item = screen.getByRole('menuitem', { name: 'Profile' })
        expect(item).toHaveClass('px-1.5', 'py-1', 'text-xs')
      })
    })

    it('applies default item size classes', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu itemSize="default" />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        const item = screen.getByRole('menuitem', { name: 'Profile' })
        expect(item).toHaveClass('px-2', 'py-1.5', 'text-sm')
      })
    })

    it('applies large item size classes', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu itemSize="lg" />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        const item = screen.getByRole('menuitem', { name: 'Profile' })
        expect(item).toHaveClass('px-3', 'py-2', 'text-base')
      })
    })
  })

  describe('Interaction', () => {
    it('handles item clicks', async () => {
      const user = userEvent.setup()
      const onSelect = jest.fn()
      
      render(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>Open</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={onSelect}>
              Click me
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      const item = await screen.findByRole('menuitem', { name: 'Click me' })
      await user.click(item)
      
      expect(onSelect).toHaveBeenCalled()
    })

    it('handles keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      // Wait for menu to be visible and content to have focus
      const menuContent = await screen.findByRole('menu')
      expect(menuContent).toBeInTheDocument()
      
      // Navigate using keyboard
      await user.keyboard('{ArrowDown}')
      
      const firstItem = screen.getByRole('menuitem', { name: 'Profile' })
      expect(firstItem).toHaveFocus()
      
      await user.keyboard('{ArrowDown}')
      
      const secondItem = screen.getByRole('menuitem', { name: 'Settings' })
      expect(secondItem).toHaveFocus()
    })

    it('closes menu when item is selected', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      const item = await screen.findByRole('menuitem', { name: 'Profile' })
      await user.click(item)
      
      await waitFor(() => {
        expect(screen.queryByRole('menuitem', { name: 'Profile' })).not.toBeInTheDocument()
      })
    })

    it('handles disabled items correctly', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      const disabledItem = await screen.findByRole('menuitem', { name: 'Disabled Item' })
      expect(disabledItem).toHaveAttribute('data-disabled')
      expect(disabledItem).toHaveClass('data-[disabled]:pointer-events-none', 'data-[disabled]:opacity-50')
    })
  })

  describe('Checkbox Items', () => {
    it('renders checkbox items correctly', async () => {
      const user = userEvent.setup()
      render(<TestCheckboxDropdown />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      const item1 = await screen.findByRole('menuitemcheckbox', { name: 'Item 1' })
      const item2 = await screen.findByRole('menuitemcheckbox', { name: 'Item 2' })
      
      expect(item1).not.toBeChecked()
      expect(item2).toBeChecked()
    })

    it('toggles checkbox state when clicked', async () => {
      const user = userEvent.setup()
      render(<TestCheckboxDropdown />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      const item1 = await screen.findByRole('menuitemcheckbox', { name: 'Item 1' })
      expect(item1).not.toBeChecked()
      
      await user.click(item1)
      
      // Menu should stay open for checkbox items
      expect(item1).toBeChecked()
    })

    it('applies checkbox item size variants', async () => {
      const user = userEvent.setup()
      render(<TestCheckboxDropdown itemSize="lg" />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      const item = await screen.findByRole('menuitemcheckbox', { name: 'Item 1' })
      expect(item).toHaveClass('py-2', 'pl-10', 'pr-3', 'text-base')
    })
  })

  describe('Radio Items', () => {
    it('renders radio items correctly', async () => {
      const user = userEvent.setup()
      render(<TestRadioDropdown />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      const option1 = await screen.findByRole('menuitemradio', { name: 'Option 1' })
      const option2 = await screen.findByRole('menuitemradio', { name: 'Option 2' })
      
      expect(option1).toBeChecked()
      expect(option2).not.toBeChecked()
    })

    it('changes radio selection when clicked', async () => {
      const user = userEvent.setup()
      render(<TestRadioDropdown />)
      
      const trigger = screen.getByRole('button', { name: 'Radio menu' })
      await user.click(trigger)
      
      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument()
      })
      
      const option2 = await screen.findByRole('menuitemradio', { name: 'Option 2' })
      await user.click(option2)
      
      // After clicking, the menu may close, so we need to reopen to check state
      await user.click(trigger)
      
      await waitFor(() => {
        const updatedOption2 = screen.getByRole('menuitemradio', { name: 'Option 2' })
        expect(updatedOption2).toBeChecked()
        
        const updatedOption1 = screen.getByRole('menuitemradio', { name: 'Option 1' })
        expect(updatedOption1).not.toBeChecked()
      })
    })

    it('applies radio item size variants', async () => {
      const user = userEvent.setup()
      render(<TestRadioDropdown itemSize="sm" />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      const item = await screen.findByRole('menuitemradio', { name: 'Option 1' })
      expect(item).toHaveClass('py-1', 'pl-6', 'pr-1.5', 'text-xs')
    })
  })

  describe('Sub Menus', () => {
    it('renders sub menu trigger correctly', async () => {
      const user = userEvent.setup()
      render(<TestSubMenuDropdown />)
      
      const trigger = screen.getByRole('button', { name: 'Sub menu' })
      await user.click(trigger)
      
      await waitFor(() => {
        const subMenuTriggers = screen.getAllByText('Sub menu')
        // Should find both the button and the sub menu trigger
        expect(subMenuTriggers.length).toBeGreaterThan(0)
        expect(screen.getByRole('menuitem', { name: /Sub menu/ })).toBeInTheDocument()
      })
    })

    it('opens sub menu on hover', async () => {
      const user = userEvent.setup()
      render(<TestSubMenuDropdown />)
      
      const trigger = screen.getByRole('button', { name: 'Sub menu' })
      await user.click(trigger)
      
      const subTrigger = await screen.findByRole('menuitem', { name: /Sub menu/ })
      await user.hover(subTrigger)
      
      await waitFor(() => {
        expect(screen.getByText('Sub item 1')).toBeInTheDocument()
      })
    })
  })

  describe('Shortcuts', () => {
    it('renders shortcuts correctly', async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>Open</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Copy
              <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        expect(screen.getByText('⌘C')).toBeInTheDocument()
        expect(screen.getByText('⌘C')).toHaveClass('ml-auto', 'text-xs', 'tracking-widest', 'opacity-60')
      })
    })
  })

  describe('Separators', () => {
    it('renders separators correctly', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        const separators = document.querySelectorAll('[role="separator"]')
        expect(separators).toHaveLength(2)
      })
    })
  })

  describe('Accessibility', () => {
    it('has correct ARIA attributes', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu />)
      
      const trigger = screen.getByRole('button')
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      
      await user.click(trigger)
      
      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'true')
        
        const menu = screen.getByRole('menu')
        expect(menu).toBeInTheDocument()
      })
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<TestDropdownMenu />)
      
      const trigger = screen.getByRole('button')
      trigger.focus()
      
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        const firstItem = screen.getByRole('menuitem', { name: 'Profile' })
        expect(firstItem).toHaveFocus()
      })
      
      await user.keyboard('{Escape}')
      
      await waitFor(() => {
        expect(trigger).toHaveFocus()
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      })
    })

    it('meets accessibility standards', async () => {
      const user = userEvent.setup()
      const { container } = render(<TestDropdownMenu />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(async () => {
        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })
    })

    it('meets accessibility standards with checkbox items', async () => {
      const user = userEvent.setup()
      const { container } = render(<TestCheckboxDropdown />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(async () => {
        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })
    })

    it('meets accessibility standards with radio items', async () => {
      const user = userEvent.setup()
      const { container } = render(<TestRadioDropdown />)
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(async () => {
        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })
    })
  })

  describe('Performance', () => {
    it('renders efficiently with many items', async () => {
      const user = userEvent.setup()
      const startTime = performance.now()
      
      render(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>Many items</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {Array.from({ length: 100 }, (_, i) => (
              <DropdownMenuItem key={i}>
                Item {i + 1}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Item 1' })).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(1000) // Should render in less than 1 second
    })
  })

  describe('Edge Cases', () => {
    it('handles empty dropdown menu', async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>Empty</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
          </DropdownMenuContent>
        </DropdownMenu>
      )
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        const menu = screen.getByRole('menu')
        expect(menu).toBeInTheDocument()
        expect(menu).toBeEmptyDOMElement()
      })
    })

    it('handles dropdown with only separators', async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>Separators only</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSeparator />
            <DropdownMenuSeparator />
          </DropdownMenuContent>
        </DropdownMenu>
      )
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        const separators = document.querySelectorAll('[role="separator"]')
        expect(separators).toHaveLength(2)
      })
    })

    it('handles long item text gracefully', async () => {
      const user = userEvent.setup()
      const longText = 'Very long menu item text that should wrap or truncate gracefully without breaking the layout'
      
      render(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>Long text</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>{longText}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
      
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      await waitFor(() => {
        const item = screen.getByRole('menuitem', { name: longText })
        expect(item).toBeInTheDocument()
      })
    })
  })
})
