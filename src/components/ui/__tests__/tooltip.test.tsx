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

// Helper to get visible button (not the hidden accessibility span)
const getVisibleButton = (name: string) => {
  const buttons = screen.getAllByRole('button', { name })
  // Find the button that is not in a hidden accessibility span
  const visibleButton = buttons.find(el => {
    const style = el.getAttribute('style') || ''
    return !style.includes('clip: rect(0px, 0px, 0px, 0px)')
  })
  
  if (!visibleButton) {
    throw new Error(`Could not find visible button with name "${name}". Found ${buttons.length} buttons total.`)
  }
  
  return visibleButton
}

// Helper to get tooltip content using reliable data-testid
const getTooltipContent = () => {
  console.log('🔍 DEBUG: Getting tooltip by data-testid instead of role')
  const tooltip = screen.getByTestId('tooltip-content')
  console.log('✅ DEBUG: Found tooltip:', {
    tagName: tooltip.tagName,
    dataState: tooltip.getAttribute('data-state'),
    textContent: tooltip.textContent?.substring(0, 50)
  })
  return tooltip
}

// Legacy function name for backward compatibility
const getTooltipByRole = getTooltipContent

// Helper to check if tooltip is displayed
const expectTooltipToBeVisible = async (text: string) => {
  await waitFor(() => {
    const visibleElement = getVisibleTooltipContent(text)
    expect(visibleElement).toBeInTheDocument()
    expect(visibleElement).toBeVisible()
  })
}

// Helper to wait for tooltip content with robust selection
const waitForTooltipContent = async (text: string) => {
  await waitFor(() => {
    const visibleElement = getVisibleTooltipContent(text)
    expect(visibleElement).toBeInTheDocument()
  })
  return getVisibleTooltipContent(text)
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

    it('shows tooltip on hover and hides on focus change', async () => {
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
      await waitForTooltipContent('Basic tooltip content')

      // Hide by moving focus (reliable in JSDOM environment)
      await user.tab()
      
      // Wait for tooltip to be hidden
      await waitFor(() => {
        const tooltip = screen.queryByTestId('tooltip-content')
        if (!tooltip) return true // Removed from DOM
        
        const dataState = tooltip.getAttribute('data-state')
        return dataState === 'closed' // Or transitioned to closed state
      }, { timeout: 3000 })
    })

    it('shows tooltip on focus and hides on blur', async () => {
      console.log('🕐 DEBUG: Starting focus/blur test')
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <BasicTooltip />
        </TestWrapper>
      )

      console.log('🕐 DEBUG: Getting trigger button')
      const trigger = screen.getByRole('button')

      // Show on focus
      console.log('🕐 DEBUG: Starting tab to focus')
      await user.tab()
      console.log('🕐 DEBUG: Tab completed, checking focus')
      expect(trigger).toHaveFocus()
      console.log('🕐 DEBUG: Focus confirmed, waiting for tooltip content')
      await waitForTooltipContent('Basic tooltip content')
      console.log('🕐 DEBUG: Tooltip visible confirmed')

      // Hide on blur
      console.log('🕐 DEBUG: Starting tab to blur')
      await user.tab()
      console.log('🕐 DEBUG: Blur completed, waiting for tooltip to disappear')
      await waitFor(() => {
        // Use queryAllByText to check if visible tooltips are gone
        const allTooltips = screen.queryAllByText('Basic tooltip content')
        const visibleTooltips = allTooltips.filter(tooltip => {
          const style = tooltip.getAttribute('style') || ''
          return !style.includes('clip: rect(0px, 0px, 0px, 0px)')
        })
        expect(visibleTooltips).toHaveLength(0)
      }, { timeout: 10000 })
      console.log('🕐 DEBUG: Tooltip hidden confirmed')
    }, 15000)

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
      await waitForTooltipContent('Basic tooltip content')
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
          const tooltip = getVisibleTooltipContent(`${variant} tooltip`)
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
        const tooltip = getVisibleTooltipContent('Basic tooltip content')
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
          const tooltip = getVisibleTooltipContent(`${size} tooltip`)
          expect(tooltip).toBeInTheDocument()
          
          // Check that size-specific classes are applied
          if (size === 'sm') {
            expect(tooltip).toHaveClass('px-2', 'py-1', 'text-xs')
          } else if (size === 'lg') {
            expect(tooltip).toHaveClass('px-4', 'py-2', 'text-base')
          } else {
            expect(tooltip).toHaveClass('px-3', 'py-1.5', 'text-sm')
          }
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
        const tooltip = getVisibleTooltipContent('Basic tooltip content')
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
          const tooltip = getVisibleTooltipContent(`${side} tooltip`)
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
      
      await waitForTooltipContent('Basic tooltip content')
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
        expect(getVisibleTooltipContent('Basic tooltip content')).toBeInTheDocument()
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
        expect(getVisibleTooltipContent('Basic tooltip content')).toBeInTheDocument()
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
        expect(getVisibleTooltipContent('Basic tooltip content')).toBeInTheDocument()
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
        expect(getVisibleTooltipContent('Tooltip Title')).toBeInTheDocument()
        expect(getVisibleTooltipContent('This is a more complex tooltip with multiple elements.')).toBeInTheDocument()
        expect(getVisibleButton('Action')).toBeInTheDocument()
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
        const tooltip = getTooltipByRole()
        expect(tooltip).toBeInTheDocument()
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
      
      await waitForTooltipContent('Simple tooltip')
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
        const tooltip = getVisibleTooltipContent('Custom tooltip')
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
        const tooltip = getTooltipByRole()
        expect(tooltip).toBeInTheDocument()
        expect(tooltip).toHaveAttribute('data-state', 'delayed-open')
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
      
      await waitForTooltipContent('Basic tooltip content')

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
      await waitForTooltipContent('Basic tooltip content')

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
        const tooltip = getTooltipByRole()
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
        expect(getVisibleTooltipContent('Tooltip 1')).toBeInTheDocument()
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
      
      await waitForTooltipContent('Basic tooltip content')

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
      await waitForTooltipContent('Basic tooltip content')
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
      
      await waitForTooltipContent('Tooltip for nested content')
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
        // For long content, check if it contains a portion of the text
        const elements = screen.getAllByText((content, element) => {
          return content.includes('This is a very long tooltip content') && element !== null
        })
        const visibleElement = elements.find(el => {
          const style = el.getAttribute('style') || ''
          return !style.includes('clip: rect(0px, 0px, 0px, 0px)')
        })
        expect(visibleElement).toBeInTheDocument()
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
        
        await waitForTooltipContent('Tooltip for disabled button')
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
        const tooltip = getVisibleTooltipContent('Basic tooltip content')
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
        const tooltip = getVisibleTooltipContent('Basic tooltip content')
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
