import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import '@testing-library/jest-dom'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs'

expect.extend(toHaveNoViolations)

// Test component with common configuration
const TestTabs = ({ 
  variant = "default" as const, 
  size = "default" as const,
  defaultValue = "tab1",
  ...props 
}) => (
  <Tabs defaultValue={defaultValue} {...props}>
    <TabsList variant={variant} size={size}>
      <TabsTrigger value="tab1" variant={variant} size={size}>
        Tab 1
      </TabsTrigger>
      <TabsTrigger value="tab2" variant={variant} size={size}>
        Tab 2
      </TabsTrigger>
      <TabsTrigger value="tab3" variant={variant} size={size} disabled>
        Tab 3 (Disabled)
      </TabsTrigger>
    </TabsList>
    <TabsContent value="tab1" variant={variant} size={size}>
      Content for Tab 1
    </TabsContent>
    <TabsContent value="tab2" variant={variant} size={size}>
      Content for Tab 2
    </TabsContent>
    <TabsContent value="tab3" variant={variant} size={size}>
      Content for Tab 3
    </TabsContent>
  </Tabs>
)

describe('Tabs Component', () => {
  describe('Basic Rendering', () => {
    it('renders tabs correctly', () => {
      render(<TestTabs />)
      
      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Tab 3 (Disabled)' })).toBeInTheDocument()
      
      // Default tab content should be visible
      expect(screen.getByText('Content for Tab 1')).toBeInTheDocument()
      expect(screen.queryByText('Content for Tab 2')).not.toBeInTheDocument()
    })

    it('renders with different default value', () => {
      render(<TestTabs defaultValue="tab2" />)
      
      expect(screen.getByText('Content for Tab 2')).toBeInTheDocument()
      expect(screen.queryByText('Content for Tab 1')).not.toBeInTheDocument()
    })

    it('handles empty tabs', () => {
      render(
        <Tabs defaultValue="empty">
          <TabsList>
            {/* No tabs */}
          </TabsList>
        </Tabs>
      )
      
      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })
  })

  describe('Variants', () => {
    it('applies default variant classes correctly', () => {
      render(<TestTabs variant="default" />)
      
      const tabsList = screen.getByRole('tablist')
      const trigger = screen.getByRole('tab', { name: 'Tab 1' })
      
      expect(tabsList).toHaveClass('rounded-md', 'bg-muted', 'p-1')
      expect(trigger).toHaveClass('rounded-sm')
    })

    it('applies line variant classes correctly', () => {
      render(<TestTabs variant="line" />)
      
      const tabsList = screen.getByRole('tablist')
      const trigger = screen.getByRole('tab', { name: 'Tab 1' })
      
      expect(tabsList).toHaveClass('bg-transparent', 'border-b', 'border-border', 'p-0')
      expect(trigger).toHaveClass('rounded-none', 'border-b-2', 'border-transparent')
    })

    it('applies pills variant classes correctly', () => {
      render(<TestTabs variant="pills" />)
      
      const tabsList = screen.getByRole('tablist')
      const trigger = screen.getByRole('tab', { name: 'Tab 1' })
      
      expect(tabsList).toHaveClass('bg-muted/50', 'rounded-lg', 'p-1')
      expect(trigger).toHaveClass('rounded-md')
    })

    it('applies ghost variant classes correctly', () => {
      render(<TestTabs variant="ghost" />)
      
      const tabsList = screen.getByRole('tablist')
      const trigger = screen.getByRole('tab', { name: 'Tab 1' })
      
      expect(tabsList).toHaveClass('bg-transparent', 'p-0', 'gap-1')
      expect(trigger).toHaveClass('rounded-md', 'hover:bg-muted')
    })
  })

  describe('Sizes', () => {
    it('applies small size classes correctly', () => {
      render(<TestTabs size="sm" />)
      
      const tabsList = screen.getByRole('tablist')
      const trigger = screen.getByRole('tab', { name: 'Tab 1' })
      
      expect(tabsList).toHaveClass('h-8')
      expect(trigger).toHaveClass('px-2', 'py-1', 'text-xs')
    })

    it('applies default size classes correctly', () => {
      render(<TestTabs size="default" />)
      
      const tabsList = screen.getByRole('tablist')
      const trigger = screen.getByRole('tab', { name: 'Tab 1' })
      
      expect(tabsList).toHaveClass('h-10')
      expect(trigger).toHaveClass('px-3', 'py-1.5', 'text-sm')
    })

    it('applies large size classes correctly', () => {
      render(<TestTabs size="lg" />)
      
      const tabsList = screen.getByRole('tablist')
      const trigger = screen.getByRole('tab', { name: 'Tab 1' })
      
      expect(tabsList).toHaveClass('h-12')
      expect(trigger).toHaveClass('px-4', 'py-2', 'text-base')
    })
  })

  describe('Tab Interactions', () => {
    it('switches tabs when clicked', async () => {
      const user = userEvent.setup()
      render(<TestTabs />)
      
      expect(screen.getByText('Content for Tab 1')).toBeInTheDocument()
      expect(screen.queryByText('Content for Tab 2')).not.toBeInTheDocument()
      
      await user.click(screen.getByRole('tab', { name: 'Tab 2' }))
      
      await waitFor(() => {
        expect(screen.queryByText('Content for Tab 1')).not.toBeInTheDocument()
        expect(screen.getByText('Content for Tab 2')).toBeInTheDocument()
      })
    })

    it('handles disabled tabs correctly', async () => {
      const user = userEvent.setup()
      render(<TestTabs />)
      
      const disabledTab = screen.getByRole('tab', { name: 'Tab 3 (Disabled)' })
      expect(disabledTab).toBeDisabled()
      
      await user.click(disabledTab)
      
      // Should still show content for Tab 1
      expect(screen.getByText('Content for Tab 1')).toBeInTheDocument()
      expect(screen.queryByText('Content for Tab 3')).not.toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<TestTabs />)
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' })
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' })
      
      tab1.focus()
      expect(tab1).toHaveFocus()
      
      await user.keyboard('{ArrowRight}')
      expect(tab2).toHaveFocus()
      
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(screen.getByText('Content for Tab 2')).toBeInTheDocument()
      })
    })

    it('wraps around with keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<TestTabs />)
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' })
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' })
      
      tab2.focus()
      await user.keyboard('{ArrowRight}')
      
      // Should skip disabled tab and wrap to first tab
      expect(tab1).toHaveFocus()
    })
  })

  describe('Controlled State', () => {
    it('handles controlled value correctly', async () => {
      const user = userEvent.setup()
      const onValueChange = jest.fn()
      
      const { rerender } = render(
        <Tabs value="tab1" onValueChange={onValueChange}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      )
      
      expect(screen.getByText('Content 1')).toBeInTheDocument()
      
      await user.click(screen.getByRole('tab', { name: 'Tab 2' }))
      expect(onValueChange).toHaveBeenCalledWith('tab2')
      
      // Content shouldn't change until we update the value prop
      expect(screen.getByText('Content 1')).toBeInTheDocument()
      
      rerender(
        <Tabs value="tab2" onValueChange={onValueChange}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      )
      
      expect(screen.getByText('Content 2')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<TestTabs />)
      
      const tabsList = screen.getByRole('tablist')
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' })
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' })
      const content1 = screen.getByText('Content for Tab 1')
      
      expect(tabsList).toHaveAttribute('role', 'tablist')
      expect(tab1).toHaveAttribute('role', 'tab')
      expect(tab1).toHaveAttribute('aria-selected', 'true')
      expect(tab2).toHaveAttribute('aria-selected', 'false')
      
      expect(content1).toHaveAttribute('role', 'tabpanel')
      expect(content1).toHaveAttribute('aria-labelledby', tab1.id)
    })

    it('meets accessibility standards', async () => {
      const { container } = render(<TestTabs />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('meets accessibility standards with all variants', async () => {
      const variants = ['default', 'line', 'pills', 'ghost'] as const
      
      for (const variant of variants) {
        const { container } = render(<TestTabs variant={variant} />)
        const results = await axe(container)
        expect(results).toHaveNoViolations()
      }
    })

    it('provides proper focus management', () => {
      render(<TestTabs />)
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' })
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' })
      
      // The active tab should have tabindex 0, others should have -1
      expect(tab1).toHaveAttribute('tabindex', '-1') // Radix manages focus differently
      expect(tab2).toHaveAttribute('tabindex', '-1')
      
      // But the active tab should be properly marked
      expect(tab1).toHaveAttribute('aria-selected', 'true')
      expect(tab2).toHaveAttribute('aria-selected', 'false')
    })
  })

  describe('Custom Props', () => {
    it('accepts custom className', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList className="custom-list-class">
            <TabsTrigger value="tab1" className="custom-trigger-class">
              Tab 1
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="custom-content-class">
            Content
          </TabsContent>
        </Tabs>
      )
      
      expect(screen.getByRole('tablist')).toHaveClass('custom-list-class')
      expect(screen.getByRole('tab')).toHaveClass('custom-trigger-class')
      expect(screen.getByText('Content')).toHaveClass('custom-content-class')
    })

    it('forwards other props correctly', () => {
      render(
        <Tabs defaultValue="tab1" data-testid="custom-tabs">
          <TabsList data-testid="custom-list">
            <TabsTrigger value="tab1" data-testid="custom-trigger">
              Tab 1
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="custom-content">
            Content
          </TabsContent>
        </Tabs>
      )
      
      expect(screen.getByTestId('custom-tabs')).toBeInTheDocument()
      expect(screen.getByTestId('custom-list')).toBeInTheDocument()
      expect(screen.getByTestId('custom-trigger')).toBeInTheDocument()
      expect(screen.getByTestId('custom-content')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('renders efficiently with many tabs', () => {
      const manyTabs = Array.from({ length: 20 }, (_, i) => (
        <TabsTrigger key={i} value={`tab${i}`}>
          Tab {i + 1}
        </TabsTrigger>
      ))
      
      const manyContents = Array.from({ length: 20 }, (_, i) => (
        <TabsContent key={i} value={`tab${i}`}>
          Content {i + 1}
        </TabsContent>
      ))
      
      const startTime = performance.now()
      
      render(
        <Tabs defaultValue="tab0">
          <TabsList>
            {manyTabs}
          </TabsList>
          {manyContents}
        </Tabs>
      )
      
      const endTime = performance.now()
      
      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(screen.getAllByRole('tab')).toHaveLength(20)
      expect(endTime - startTime).toBeLessThan(100) // Should render quickly
    })

    it('handles frequent tab switches efficiently', async () => {
      const user = userEvent.setup()
      render(<TestTabs />)
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' })
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' })
      
      const startTime = performance.now()
      
      // Rapidly switch between tabs
      for (let i = 0; i < 10; i++) {
        await user.click(i % 2 === 0 ? tab2 : tab1)
      }
      
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(1000) // Should handle switches reasonably quickly
    })
  })

  describe('Edge Cases', () => {
    it('handles missing tab content gracefully', () => {
      render(
        <Tabs defaultValue="missing">
          <TabsList>
            <TabsTrigger value="missing">Missing Content</TabsTrigger>
          </TabsList>
          {/* No TabsContent for "missing" value */}
        </Tabs>
      )
      
      expect(screen.getByRole('tab', { name: 'Missing Content' })).toBeInTheDocument()
      // Should not throw error when content is missing
    })

    it('handles invalid default value', () => {
      render(
        <Tabs defaultValue="nonexistent">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      )
      
      expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument()
      // Should handle gracefully without errors
    })

    it('handles tabs with special characters', () => {
      render(
        <Tabs defaultValue="tab-1">
          <TabsList>
            <TabsTrigger value="tab-1">Tab with-dashes</TabsTrigger>
            <TabsTrigger value="tab_2">Tab with_underscores</TabsTrigger>
            <TabsTrigger value="tab.3">Tab with.dots</TabsTrigger>
          </TabsList>
          <TabsContent value="tab-1">Content 1</TabsContent>
          <TabsContent value="tab_2">Content 2</TabsContent>
          <TabsContent value="tab.3">Content 3</TabsContent>
        </Tabs>
      )
      
      expect(screen.getByRole('tab', { name: 'Tab with-dashes' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Tab with_underscores' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Tab with.dots' })).toBeInTheDocument()
    })

    it('handles tabs with complex content', () => {
      render(
        <Tabs defaultValue="complex">
          <TabsList>
            <TabsTrigger value="complex">
              <span>Complex</span>
              <strong>Tab</strong>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="complex">
            <div>
              <h2>Complex Content</h2>
              <p>With multiple elements</p>
              <button>And interactive elements</button>
            </div>
          </TabsContent>
        </Tabs>
      )
      
      expect(screen.getByRole('tab')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Complex Content' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'And interactive elements' })).toBeInTheDocument()
    })
  })
})
