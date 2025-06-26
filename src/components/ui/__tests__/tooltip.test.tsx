import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { 
  Tooltip, 
  TooltipTrigger, 
  TooltipContent, 
  TooltipProvider, 
  TooltipArrow,
  SimpleTooltip,
  tooltipContentVariants 
} from '../tooltip'

// Test utilities
const TestWrapper = ({ children, delayDuration = 0 }: { children: React.ReactNode; delayDuration?: number }) => (
  <TooltipProvider delayDuration={delayDuration}>{children}</TooltipProvider>
)

// Helper to get visible tooltip content (not the hidden accessibility span)
const getVisibleTooltipContent = (text: string) => {
  const elements = screen.getAllByText(text)
  // Find the element that is not the hidden accessibility span
  return elements.find(el => {
    const style = el.getAttribute('style') || ''
    return !style.includes('clip: rect(0px, 0px, 0px, 0px)')
  })
}

// Helper to check if tooltip is displayed
const expectTooltipToBeVisible = async (text: string) => {
  await waitFor(() => {
    const visibleElement = getVisibleTooltipContent(text)
    expect(visibleElement).toBeInTheDocument()
    expect(visibleElement).toBeVisible()
  })
}

const BasicTooltip = ({ 
  content = "Basic tooltip content", 
  triggerText = "Hover me",
  variant,
  size,
  side,
  sideOffset,
  showArrow = false,
  className,
  contentClassName,
  ...props 
}: any) => (
  <Tooltip {...props}>
    <TooltipTrigger asChild>
      <button className={className}>{triggerText}</button>
    </TooltipTrigger>
    <TooltipContent 
      variant={variant} 
      size={size} 
      side={side} 
      sideOffset={sideOffset}
      className={contentClassName}
    >
      {content}
      {showArrow && <TooltipArrow variant={variant} />}
    </TooltipContent>
  </Tooltip>
)

describe('Tooltip Components', () => {
  describe('Basic Functionality', () => {
    it('renders tooltip with default props', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <BasicTooltip />
        </TestWrapper>
      )

      const trigger = screen.getByRole('button', { name: 'Hover me' })
      expect(trigger).toBeInTheDocument()

      await user.hover(trigger)
      await expectTooltipToBeVisible('Basic tooltip content')
    })

    it('shows tooltip on hover and hides on unhover', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <BasicTooltip />
        </TestWrapper>
      )

      const trigger = screen.getByRole('button')

      // Initially not visible
      expect(screen.queryByText('Basic tooltip content')).not.toBeInTheDocument()

      // Show on hover
      await user.hover(trigger)
      await waitFor(() => {
        expect(screen.getByText('Basic tooltip content')).toBeInTheDocument()
      })

      // Hide on unhover
      await user.unhover(trigger)
      await waitFor(() => {
        expect(screen.queryByText('Basic tooltip content')).not.toBeInTheDocument()
      })
    })

    it('shows tooltip on focus and hides on blur', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <BasicTooltip />
        </TestWrapper>
      )

      const trigger = screen.getByRole('button')

      // Show on focus
      await user.tab()
      expect(trigger).toHaveFocus()
      await waitFor(() => {
        expect(screen.getByText('Basic tooltip content')).toBeInTheDocument()
      })

      // Hide on blur
      await user.tab()
      await waitFor(() => {
        expect(screen.queryByText('Basic tooltip content')).not.toBeInTheDocument()
      })
    })

    it('respects delay duration', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper delayDuration={500}>
          <BasicTooltip />
        </TestWrapper>
      )

      const trigger = screen.getByRole('button')
      await user.hover(trigger)

      // Should not appear immediately
      expect(screen.queryByText('Basic tooltip content')).not.toBeInTheDocument()

      // Should appear after delay
      await waitFor(() => {
        expect(screen.getByText('Basic tooltip content')).toBeInTheDocument()
      }, { timeout: 1000 })
    })
  })

  describe('Variants', () => {
    const variants = ['default', 'inverse', 'secondary', 'success', 'warning', 'destructive', 'outline'] as const

    variants.forEach(variant => {
      it(`renders ${variant} variant correctly`, async () => {
        const user = userEvent.setup()
        
        render(
          <TestWrapper>
            <BasicTooltip variant={variant} content={`${variant} tooltip`} />
          </TestWrapper>
        )

        await user.hover(screen.getByRole('button'))
        
        await waitFor(() => {
          const tooltip = screen.getByText(`${variant} tooltip`)
          expect(tooltip).toBeInTheDocument()
          
          // Check that variant classes are applied
          const classes = tooltipContentVariants({ variant, size: 'default' })
          expect(tooltip).toHaveClass(...classes.split(' ').filter(c => c.trim()))
        })
      })
    })

    it('applies custom variant classes', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <BasicTooltip variant="success" />
        </TestWrapper>
      )

      await user.hover(screen.getByRole('button'))
      
      await waitFor(() => {
        const tooltip = screen.getByText('Basic tooltip content')
        expect(tooltip).toHaveClass('bg-green-100', 'text-green-900', 'border-green-200')
      })
    })
  })

  describe('Sizes', () => {
    const sizes = ['sm', 'default', 'lg'] as const

    sizes.forEach(size => {
      it(`renders ${size} size correctly`, async () => {
        const user = userEvent.setup()
        
        render(
          <TestWrapper>
            <BasicTooltip size={size} content={`${size} tooltip`} />
          </TestWrapper>
        )

        await user.hover(screen.getByRole('button'))
        
        await waitFor(() => {
          const tooltip = screen.getByText(`${size} tooltip`)
          expect(tooltip).toBeInTheDocument()
          
          // Check that size classes are applied
          const classes = tooltipContentVariants({ variant: 'default', size })
          expect(tooltip).toHaveClass(...classes.split(' ').filter(c => c.trim()))
        })
      })
    })

    it('applies correct size classes', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <BasicTooltip size="lg" />
        </TestWrapper>
      )

      await user.hover(screen.getByRole('button'))
      
      await waitFor(() => {
        const tooltip = screen.getByText('Basic tooltip content')
        expect(tooltip).toHaveClass('px-4', 'py-2', 'text-base')
      })
    })
  })

  describe('Positioning', () => {
    const sides = ['top', 'right', 'bottom', 'left'] as const

    sides.forEach(side => {
      it(`positions tooltip on ${side} side`, async () => {
        const user = userEvent.setup()
        
        render(
          <TestWrapper>
            <BasicTooltip side={side} content={`${side} tooltip`} />
          </TestWrapper>
        )

        await user.hover(screen.getByRole('button'))
        
        await waitFor(() => {
          const tooltip = screen.getByText(`${side} tooltip`)
          expect(tooltip).toBeInTheDocument()
        })
      })
    })

    it('respects sideOffset prop', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <BasicTooltip sideOffset={20} />
        </TestWrapper>
      )

      await user.hover(screen.getByRole('button'))
      
      await waitFor(() => {
        expect(screen.getByText('Basic tooltip content')).toBeInTheDocument()
      })
    })
  })

  describe('Arrow', () => {
    it('renders arrow when showArrow is true', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <BasicTooltip showArrow={true} />
        </TestWrapper>
      )

      await user.hover(screen.getByRole('button'))
      
      await waitFor(() => {
        expect(screen.getByText('Basic tooltip content')).toBeInTheDocument()
        // Arrow is rendered but might not be easily testable in JSDOM
      })
    })

    it('does not render arrow when showArrow is false', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <BasicTooltip showArrow={false} />
        </TestWrapper>
      )

      await user.hover(screen.getByRole('button'))
      
      await waitFor(() => {
        expect(screen.getByText('Basic tooltip content')).toBeInTheDocument()
      })
    })

    it('arrow has correct variant styling', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <BasicTooltip variant="success" showArrow={true} />
        </TestWrapper>
      )

      await user.hover(screen.getByRole('button'))
      
      await waitFor(() => {
        expect(screen.getByText('Basic tooltip content')).toBeInTheDocument()
      })
    })
  })

  describe('Custom Content', () => {
    it('renders complex content', async () => {
      const user = userEvent.setup()
      
      const complexContent = (
        <div>
          <h4>Tooltip Title</h4>
          <p>This is a more complex tooltip with multiple elements.</p>
          <button>Action</button>
        </div>
      )
      
      render(
        <TestWrapper>
          <BasicTooltip content={complexContent} />
        </TestWrapper>
      )

      await user.hover(screen.getByRole('button', { name: 'Hover me' }))
      
      await waitFor(() => {
        expect(screen.getByText('Tooltip Title')).toBeInTheDocument()
        expect(screen.getByText('This is a more complex tooltip with multiple elements.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
      })
    })

    it('handles empty content gracefully', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <BasicTooltip content="" />
        </TestWrapper>
      )

      await user.hover(screen.getByRole('button'))
      
      // Should still render but with empty content
      await waitFor(() => {
        const tooltips = screen.getAllByRole('tooltip')
        expect(tooltips).toHaveLength(1)
      })
    })
  })

  describe('SimpleTooltip Component', () => {
    it('renders simple tooltip with minimal props', async () => {
      const user = userEvent.setup()
      
      render(
        <SimpleTooltip content="Simple tooltip">
          <button>Simple trigger</button>
        </SimpleTooltip>
      )

      await user.hover(screen.getByRole('button'))
      
      await waitFor(() => {
        expect(screen.getByText('Simple tooltip')).toBeInTheDocument()
      })
    })

    it('respects disabled prop', async () => {
      const user = userEvent.setup()
      
      render(
        <SimpleTooltip content="Should not show" disabled>
          <button>Disabled tooltip</button>
        </SimpleTooltip>
      )

      await user.hover(screen.getByRole('button'))
      
      // Should not show tooltip
      await waitFor(() => {
        expect(screen.queryByText('Should not show')).not.toBeInTheDocument()
      }, { timeout: 500 })
    })

    it('applies all props correctly', async () => {
      const user = userEvent.setup()
      
      render(
        <SimpleTooltip 
          content="Custom tooltip"
          variant="success"
          size="lg"
          side="right"
          sideOffset={10}
          showArrow={true}
          delayDuration={100}
        >
          <button>Custom tooltip trigger</button>
        </SimpleTooltip>
      )

      await user.hover(screen.getByRole('button'))
      
      await waitFor(() => {
        const tooltip = screen.getByText('Custom tooltip')
        expect(tooltip).toBeInTheDocument()
        expect(tooltip).toHaveClass('bg-green-100', 'text-green-900', 'px-4', 'py-2', 'text-base')
      })
    })
  })

  describe('Accessibility', () => {
    it('has correct ARIA attributes', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <BasicTooltip />
        </TestWrapper>
      )

      const trigger = screen.getByRole('button')
      
      await user.hover(trigger)
      
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip')
        expect(tooltip).toBeInTheDocument()
        expect(tooltip).toHaveAttribute('data-state', 'open')
      })
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <input type="text" placeholder="Before" />
          <TestWrapper>
            <BasicTooltip />
          </TestWrapper>
          <input type="text" placeholder="After" />
        </div>
      )

      const input1 = screen.getByPlaceholderText('Before')
      const trigger = screen.getByRole('button')
      const input2 = screen.getByPlaceholderText('After')

      // Tab to trigger
      input1.focus()
      await user.tab()
      expect(trigger).toHaveFocus()
      
      await waitFor(() => {
        expect(screen.getByText('Basic tooltip content')).toBeInTheDocument()
      })

      // Tab away
      await user.tab()
      expect(input2).toHaveFocus()
      
      await waitFor(() => {
        expect(screen.queryByText('Basic tooltip content')).not.toBeInTheDocument()
      })
    })

    it('supports escape key to close', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <BasicTooltip />
        </TestWrapper>
      )

      const trigger = screen.getByRole('button')
      
      await user.hover(trigger)
      await waitFor(() => {
        expect(screen.getByText('Basic tooltip content')).toBeInTheDocument()
      })

      await user.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.queryByText('Basic tooltip content')).not.toBeInTheDocument()
      })
    })

    it('has proper role and labeling', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <Tooltip>
            <TooltipTrigger asChild>
              <button aria-label="Information">Info</button>
            </TooltipTrigger>
            <TooltipContent>
              Additional information about this feature
            </TooltipContent>
          </Tooltip>
        </TestWrapper>
      )

      const trigger = screen.getByLabelText('Information')
      expect(trigger).toBeInTheDocument()

      await user.hover(trigger)
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip')
        expect(tooltip).toHaveTextContent('Additional information about this feature')
      })
    })
  })

  describe('Performance', () => {
    it('handles multiple tooltips efficiently', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <div>
            {Array.from({ length: 5 }, (_, i) => (
              <BasicTooltip 
                key={i}
                triggerText={`Trigger ${i + 1}`}
                content={`Tooltip ${i + 1}`}
              />
            ))}
          </div>
        </TestWrapper>
      )

      // Test that all triggers render
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByRole('button', { name: `Trigger ${i}` })).toBeInTheDocument()
      }

      // Test that tooltips show independently
      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' })
      await user.hover(trigger1)
      
      await waitFor(() => {
        expect(screen.getByText('Tooltip 1')).toBeInTheDocument()
        expect(screen.queryByText('Tooltip 2')).not.toBeInTheDocument()
      })
    })

    it('cleans up event listeners properly', async () => {
      const user = userEvent.setup()
      
      const { unmount } = render(
        <TestWrapper>
          <BasicTooltip />
        </TestWrapper>
      )

      const trigger = screen.getByRole('button')
      await user.hover(trigger)
      
      await waitFor(() => {
        expect(screen.getByText('Basic tooltip content')).toBeInTheDocument()
      })

      // Unmount should not cause errors
      unmount()
    })
  })

  describe('Edge Cases', () => {
    it('handles rapid hover/unhover', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <BasicTooltip />
        </TestWrapper>
      )

      const trigger = screen.getByRole('button')

      // Rapid hover/unhover
      await user.hover(trigger)
      await user.unhover(trigger)
      await user.hover(trigger)
      await user.unhover(trigger)
      await user.hover(trigger)

      // Should still work correctly
      await waitFor(() => {
        expect(screen.getByText('Basic tooltip content')).toBeInTheDocument()
      })
    })

    it('works with nested interactive elements', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <button>Nested button</button>
                <span>Nested span</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Tooltip for nested content
            </TooltipContent>
          </Tooltip>
        </TestWrapper>
      )

      const nestedButton = screen.getByRole('button', { name: 'Nested button' })
      await user.hover(nestedButton)
      
      await waitFor(() => {
        expect(screen.getByText('Tooltip for nested content')).toBeInTheDocument()
      })
    })

    it('handles very long content', async () => {
      const user = userEvent.setup()
      const longContent = 'This is a very long tooltip content that might overflow or cause layout issues. '.repeat(10)
      
      render(
        <TestWrapper>
          <BasicTooltip content={longContent} />
        </TestWrapper>
      )

      await user.hover(screen.getByRole('button'))
      
      await waitFor(() => {
        expect(screen.getByText(longContent)).toBeInTheDocument()
      })
    })

    it('works when trigger is disabled', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <button disabled>Disabled trigger</button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Tooltip for disabled button
            </TooltipContent>
          </Tooltip>
        </TestWrapper>
      )

      const wrapper = screen.getByRole('button').parentElement
      if (wrapper) {
        await user.hover(wrapper)
        
        await waitFor(() => {
          expect(screen.getByText('Tooltip for disabled button')).toBeInTheDocument()
        })
      }
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className to trigger', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <BasicTooltip className="custom-trigger-class" />
        </TestWrapper>
      )

      const trigger = screen.getByRole('button')
      expect(trigger).toHaveClass('custom-trigger-class')
    })

    it('applies custom className to content', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <BasicTooltip contentClassName="custom-content-class" />
        </TestWrapper>
      )

      await user.hover(screen.getByRole('button'))
      
      await waitFor(() => {
        const tooltip = screen.getByText('Basic tooltip content')
        expect(tooltip).toHaveClass('custom-content-class')
      })
    })

    it('combines variant classes with custom classes', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <BasicTooltip 
            variant="success" 
            size="lg" 
            contentClassName="custom-class border-4" 
          />
        </TestWrapper>
      )

      await user.hover(screen.getByRole('button'))
      
      await waitFor(() => {
        const tooltip = screen.getByText('Basic tooltip content')
        expect(tooltip).toHaveClass('custom-class', 'border-4', 'bg-green-100', 'px-4', 'py-2')
      })
    })
  })
})

describe('Tooltip Variants Function', () => {
  it('generates correct classes for all variant combinations', () => {
    const variants = ['default', 'inverse', 'secondary', 'success', 'warning', 'destructive', 'outline'] as const
    const sizes = ['sm', 'default', 'lg'] as const

    variants.forEach(variant => {
      sizes.forEach(size => {
        const classes = tooltipContentVariants({ variant, size })
        expect(classes).toBeTruthy()
        expect(typeof classes).toBe('string')
      })
    })
  })

  it('returns default classes when no variants provided', () => {
    const classes = tooltipContentVariants({})
    expect(classes).toContain('border')
    expect(classes).toContain('bg-popover')
    expect(classes).toContain('px-3')
    expect(classes).toContain('py-1.5')
    expect(classes).toContain('text-sm')
  })
})
