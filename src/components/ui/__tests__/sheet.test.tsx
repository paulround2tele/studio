import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '../sheet'
import { Button } from '../button'

expect.extend(toHaveNoViolations)

// Test component with all props
interface TestSheetProps {
  side?: 'top' | 'bottom' | 'left' | 'right'
  size?: 'sm' | 'default' | 'lg' | 'xl' | 'full'
  variant?: 'default' | 'elevated' | 'ghost' | 'destructive'
  overlayVariant?: 'default' | 'light' | 'dark' | 'blur'
  hideClose?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const TestSheet: React.FC<TestSheetProps> = ({
  side = 'right',
  size = 'default',
  variant = 'default',
  overlayVariant = 'default',
  hideClose = false,
  open,
  onOpenChange
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetTrigger asChild>
      <Button>Open Sheet</Button>
    </SheetTrigger>
    <SheetContent 
      side={side} 
      size={size} 
      variant={variant}
      overlayVariant={overlayVariant}
      hideClose={hideClose}
    >
      <SheetHeader size={size}>
        <SheetTitle size={size}>Test Sheet Title</SheetTitle>
        <SheetDescription size={size}>
          This is a test sheet description.
        </SheetDescription>
      </SheetHeader>
      <div>Sheet content goes here.</div>
      <SheetFooter size={size}>
        <SheetClose asChild>
          <Button variant="outline">Cancel</Button>
        </SheetClose>
        <Button>Confirm</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
)

describe('Sheet Component', () => {
  describe('Basic Rendering', () => {
    it('renders trigger correctly', () => {
      render(<TestSheet />)
      expect(screen.getByRole('button', { name: 'Open Sheet' })).toBeInTheDocument()
    })

    it('opens sheet when trigger is clicked', async () => {
      const user = userEvent.setup()
      render(<TestSheet />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Test Sheet Title')).toBeInTheDocument()
        expect(screen.getByText('This is a test sheet description.')).toBeInTheDocument()
        expect(screen.getByText('Sheet content goes here.')).toBeInTheDocument()
      })
    })

    it('closes sheet when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<TestSheet />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      const closeButton = screen.getByRole('button', { name: 'Close' })
      await user.click(closeButton)
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('closes sheet when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<TestSheet />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('can hide close button', async () => {
      const user = userEvent.setup()
      render(<TestSheet hideClose={true} />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
      })
    })
  })

  describe('Side Variants', () => {
    it('applies right side classes correctly', async () => {
      const user = userEvent.setup()
      render(<TestSheet side="right" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const sheet = screen.getByRole('dialog')
        expect(sheet).toHaveClass('inset-y-0', 'right-0', 'h-full', 'border-l')
      })
    })

    it('applies left side classes correctly', async () => {
      const user = userEvent.setup()
      render(<TestSheet side="left" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const sheet = screen.getByRole('dialog')
        expect(sheet).toHaveClass('inset-y-0', 'left-0', 'h-full', 'border-r')
      })
    })

    it('applies top side classes correctly', async () => {
      const user = userEvent.setup()
      render(<TestSheet side="top" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const sheet = screen.getByRole('dialog')
        expect(sheet).toHaveClass('inset-x-0', 'top-0', 'border-b')
      })
    })

    it('applies bottom side classes correctly', async () => {
      const user = userEvent.setup()
      render(<TestSheet side="bottom" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const sheet = screen.getByRole('dialog')
        expect(sheet).toHaveClass('inset-x-0', 'bottom-0', 'border-t')
      })
    })
  })

  describe('Size Variants', () => {
    it('applies small size classes correctly for right side', async () => {
      const user = userEvent.setup()
      render(<TestSheet side="right" size="sm" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const sheet = screen.getByRole('dialog')
        expect(sheet).toHaveClass('w-80', 'p-4')
      })
    })

    it('applies default size classes correctly for right side', async () => {
      const user = userEvent.setup()
      render(<TestSheet side="right" size="default" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const sheet = screen.getByRole('dialog')
        expect(sheet).toHaveClass('w-96', 'p-6')
      })
    })

    it('applies large size classes correctly for right side', async () => {
      const user = userEvent.setup()
      render(<TestSheet side="right" size="lg" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const sheet = screen.getByRole('dialog')
        expect(sheet).toHaveClass('w-1/2', 'p-8')
      })
    })

    it('applies extra large size classes correctly for right side', async () => {
      const user = userEvent.setup()
      render(<TestSheet side="right" size="xl" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const sheet = screen.getByRole('dialog')
        expect(sheet).toHaveClass('w-2/3', 'p-8')
      })
    })

    it('applies full size classes correctly for right side', async () => {
      const user = userEvent.setup()
      render(<TestSheet side="right" size="full" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const sheet = screen.getByRole('dialog')
        expect(sheet).toHaveClass('w-full', 'p-6')
      })
    })

    it('applies small size classes correctly for top side', async () => {
      const user = userEvent.setup()
      render(<TestSheet side="top" size="sm" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const sheet = screen.getByRole('dialog')
        expect(sheet).toHaveClass('h-1/4', 'p-4')
      })
    })

    it('applies large size classes correctly for bottom side', async () => {
      const user = userEvent.setup()
      render(<TestSheet side="bottom" size="lg" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const sheet = screen.getByRole('dialog')
        expect(sheet).toHaveClass('h-1/2', 'p-8')
      })
    })
  })

  describe('Content Variants', () => {
    it('applies default variant classes correctly', async () => {
      const user = userEvent.setup()
      render(<TestSheet variant="default" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const sheet = screen.getByRole('dialog')
        expect(sheet).toHaveClass('bg-background')
        expect(sheet).not.toHaveClass('shadow-xl', 'bg-transparent', 'border-destructive/50')
      })
    })

    it('applies elevated variant classes correctly', async () => {
      const user = userEvent.setup()
      render(<TestSheet variant="elevated" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const sheet = screen.getByRole('dialog')
        expect(sheet).toHaveClass('shadow-xl')
      })
    })

    it('applies ghost variant classes correctly', async () => {
      const user = userEvent.setup()
      render(<TestSheet variant="ghost" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const sheet = screen.getByRole('dialog')
        expect(sheet).toHaveClass('bg-transparent', 'border-0', 'shadow-none')
      })
    })

    it('applies destructive variant classes correctly', async () => {
      const user = userEvent.setup()
      render(<TestSheet variant="destructive" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const sheet = screen.getByRole('dialog')
        expect(sheet).toHaveClass('border-destructive/50')
      })
    })
  })

  describe('Overlay Variants', () => {
    it('applies default overlay variant correctly', async () => {
      const user = userEvent.setup()
      render(<TestSheet overlayVariant="default" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const overlay = document.querySelector('.fixed.inset-0.z-50[data-state="open"]')
        expect(overlay).toHaveClass('bg-black/80')
      })
    })

    it('applies light overlay variant correctly', async () => {
      const user = userEvent.setup()
      render(<TestSheet overlayVariant="light" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const overlay = document.querySelector('.fixed.inset-0.z-50[data-state="open"]')
        expect(overlay).toHaveClass('bg-black/50')
      })
    })

    it('applies dark overlay variant correctly', async () => {
      const user = userEvent.setup()
      render(<TestSheet overlayVariant="dark" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const overlay = document.querySelector('.fixed.inset-0.z-50[data-state="open"]')
        expect(overlay).toHaveClass('bg-black/90')
      })
    })

    it('applies blur overlay variant correctly', async () => {
      const user = userEvent.setup()
      render(<TestSheet overlayVariant="blur" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const overlay = document.querySelector('.fixed.inset-0.z-50[data-state="open"]')
        expect(overlay).toHaveClass('bg-black/60', 'backdrop-blur-sm')
      })
    })
  })

  describe('Footer Alignment', () => {
    it('applies default right alignment correctly', async () => {
      const user = userEvent.setup()
      render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Test Sheet</SheetTitle>
            </SheetHeader>
            <SheetFooter data-testid="footer" alignment="right">
              <Button>Action</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      await waitFor(() => {
        const footer = screen.getByTestId('footer')
        expect(footer).toHaveClass('sm:justify-end')
      })
    })

    it('applies left alignment correctly', async () => {
      const user = userEvent.setup()
      render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Test Sheet</SheetTitle>
            </SheetHeader>
            <SheetFooter data-testid="footer" alignment="left">
              <Button>Action</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      await waitFor(() => {
        const footer = screen.getByTestId('footer')
        expect(footer).toHaveClass('sm:justify-start')
      })
    })

    it('applies center alignment correctly', async () => {
      const user = userEvent.setup()
      render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Test Sheet</SheetTitle>
            </SheetHeader>
            <SheetFooter data-testid="footer" alignment="center">
              <Button>Action</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      await waitFor(() => {
        const footer = screen.getByTestId('footer')
        expect(footer).toHaveClass('sm:justify-center')
      })
    })

    it('applies between alignment correctly', async () => {
      const user = userEvent.setup()
      render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Test Sheet</SheetTitle>
            </SheetHeader>
            <SheetFooter data-testid="footer" alignment="between">
              <Button>Action</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      await waitFor(() => {
        const footer = screen.getByTestId('footer')
        expect(footer).toHaveClass('sm:justify-between')
      })
    })
  })

  describe('Controlled State', () => {
    it('handles controlled open state correctly', () => {
      const onOpenChange = jest.fn()
      
      render(<TestSheet open={true} onOpenChange={onOpenChange} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('calls onOpenChange when close button is clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = jest.fn()
      
      render(<TestSheet open={true} onOpenChange={onOpenChange} />)
      
      const closeButton = screen.getByRole('button', { name: 'Close' })
      await user.click(closeButton)
      
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Keyboard Interactions', () => {
    it('closes sheet when Escape key is pressed', async () => {
      const user = userEvent.setup()
      render(<TestSheet />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      await user.keyboard('{Escape}')
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('traps focus within sheet', async () => {
      const user = userEvent.setup()
      render(<TestSheet />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Focus should be trapped within the sheet
      const closeButton = screen.getByRole('button', { name: 'Close' })
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      const confirmButton = screen.getByRole('button', { name: 'Confirm' })
      
      expect(document.activeElement).toBeInTheDocument()
      
      await user.tab()
      expect([closeButton, cancelButton, confirmButton]).toContain(document.activeElement)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', async () => {
      const user = userEvent.setup()
      render(<TestSheet />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        const sheet = screen.getByRole('dialog')
        const title = screen.getByText('Test Sheet Title')
        const description = screen.getByText('This is a test sheet description.')
        
        expect(sheet).toHaveAttribute('role', 'dialog')
        expect(sheet).toHaveAttribute('aria-labelledby', title.id)
        expect(sheet).toHaveAttribute('aria-describedby', description.id)
      })
    })

    it('properly associates description with sheet', async () => {
      const user = userEvent.setup()
      render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Accessible Sheet</SheetTitle>
              <SheetDescription>This sheet has proper accessibility.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      await waitFor(() => {
        const sheet = screen.getByRole('dialog')
        const description = screen.getByText('This sheet has proper accessibility.')
        
        expect(sheet).toHaveAttribute('aria-describedby', description.id)
      })
    })

    it('meets accessibility standards', async () => {
      const user = userEvent.setup()
      const { container } = render(<TestSheet />)
      
      await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('meets accessibility standards with all sizes', async () => {
      const user = userEvent.setup()
      const sizes: Array<'sm' | 'default' | 'lg' | 'xl'> = ['sm', 'default', 'lg', 'xl']
      
      for (const size of sizes) {
        const { container, unmount } = render(<TestSheet size={size} />)
        
        await user.click(screen.getByRole('button', { name: 'Open Sheet' }))
        
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument()
        })
        
        const results = await axe(container)
        expect(results).toHaveNoViolations()
        
        unmount()
      }
    })
  })

  describe('Custom Props', () => {
    it('accepts custom className', async () => {
      const user = userEvent.setup()
      render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open</Button>
          </SheetTrigger>
          <SheetContent className="custom-sheet-class">
            <SheetHeader>
              <SheetTitle>Custom Sheet</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      await waitFor(() => {
        const sheet = screen.getByRole('dialog')
        expect(sheet).toHaveClass('custom-sheet-class')
      })
    })

    it('forwards other props correctly', async () => {
      const user = userEvent.setup()
      render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open</Button>
          </SheetTrigger>
          <SheetContent data-testid="custom-sheet">
            <SheetHeader>
              <SheetTitle>Custom Props Sheet</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      await waitFor(() => {
        expect(screen.getByTestId('custom-sheet')).toBeInTheDocument()
      })
    })
  })

  describe('Performance', () => {
    it('renders efficiently with complex content', async () => {
      const user = userEvent.setup()
      
      const complexContent = Array.from({ length: 50 }, (_, i) => (
        <div key={i}>Complex content item {i + 1}</div>
      ))
      
      const startTime = performance.now()
      
      render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open Complex Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Complex Sheet</SheetTitle>
            </SheetHeader>
            {complexContent}
            <SheetFooter>
              <Button>Action</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open Complex Sheet' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(1000) // Should render reasonably quickly
    })

    it('handles frequent open/close efficiently', async () => {
      const user = userEvent.setup()
      render(<TestSheet />)
      
      const trigger = screen.getByRole('button', { name: 'Open Sheet' })
      
      const startTime = performance.now()
      
      // Rapidly open and close sheet multiple times
      for (let i = 0; i < 5; i++) {
        await user.click(trigger)
        
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument()
        })
        
        const closeButton = screen.getByRole('button', { name: 'Close' })
        await user.click(closeButton)
        
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
      }
      
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(2000) // Should handle repeated operations efficiently
    })
  })

  describe('Edge Cases', () => {
    it('handles missing title gracefully', async () => {
      const user = userEvent.setup()
      render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              {/* No SheetTitle */}
              <SheetDescription>Just a description</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Just a description')).toBeInTheDocument()
      })
    })

    it('handles missing description gracefully', async () => {
      const user = userEvent.setup()
      render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Just a title</SheetTitle>
              {/* No SheetDescription */}
            </SheetHeader>
          </SheetContent>
        </Sheet>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Just a title')).toBeInTheDocument()
      })
    })

    it('handles empty content gracefully', async () => {
      const user = userEvent.setup()
      render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open Empty</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Empty Sheet</SheetTitle>
              <SheetDescription>Testing empty content</SheetDescription>
            </SheetHeader>
            {/* Empty content */}
          </SheetContent>
        </Sheet>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open Empty' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Should not throw errors with empty content
    })

    it('handles complex nested content', async () => {
      const user = userEvent.setup()
      render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open Nested</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Nested Content Sheet</SheetTitle>
              <SheetDescription>Testing complex nested content</SheetDescription>
            </SheetHeader>
            <div>
              <h3>Nested Content</h3>
              <form>
                <input type="text" placeholder="Input field" />
                <textarea placeholder="Text area"></textarea>
                <select>
                  <option>Option 1</option>
                  <option>Option 2</option>
                </select>
              </form>
            </div>
          </SheetContent>
        </Sheet>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open Nested' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Input field')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Text area')).toBeInTheDocument()
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })
    })
  })
})
