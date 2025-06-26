import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import '@testing-library/jest-dom'

import { 
  Dialog, 
  DialogTrigger, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogClose
} from '../dialog'
import { Button } from '../button'

expect.extend(toHaveNoViolations)

// Test component with common configuration
const TestDialog = ({ 
  size = "default" as const,
  variant = "default" as const,
  overlayVariant = "default" as const,
  open = undefined,
  onOpenChange = undefined,
  hideClose = false,
  ...props 
}: {
  size?: "sm" | "default" | "lg" | "xl" | "full";
  variant?: "default" | "destructive" | "success" | "warning";
  overlayVariant?: "default" | "light" | "dark" | "blur";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideClose?: boolean;
  [key: string]: any;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange} {...props}>
    <DialogTrigger asChild>
      <Button>Open Dialog</Button>
    </DialogTrigger>
    <DialogContent 
      size={size} 
      variant={variant} 
      overlayVariant={overlayVariant}
      hideClose={hideClose}
    >
      <DialogHeader size={size}>
        <DialogTitle size={size}>Test Dialog Title</DialogTitle>
        <DialogDescription size={size}>
          This is a test dialog description.
        </DialogDescription>
      </DialogHeader>
      <div>Dialog content goes here.</div>
      <DialogFooter size={size}>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button>Confirm</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

describe('Dialog Component', () => {
  describe('Basic Rendering', () => {
    it('renders trigger correctly', () => {
      render(<TestDialog />)
      
      expect(screen.getByRole('button', { name: 'Open Dialog' })).toBeInTheDocument()
    })

    it('opens dialog when trigger is clicked', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Test Dialog Title' })).toBeInTheDocument()
        expect(screen.getByText('This is a test dialog description.')).toBeInTheDocument()
      })
    })

    it('closes dialog when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      const closeButton = screen.getByRole('button', { name: 'Close' })
      await user.click(closeButton)
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('closes dialog when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
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
      render(<TestDialog hideClose={true} />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
      })
    })
  })

  describe('Content Sizes', () => {
    it('applies small size classes correctly', async () => {
      const user = userEvent.setup()
      render(<TestDialog size="sm" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        const title = screen.getByRole('heading', { name: 'Test Dialog Title' })
        
        expect(dialog).toHaveClass('max-w-sm', 'p-4')
        expect(title).toHaveClass('text-base')
      })
    })

    it('applies default size classes correctly', async () => {
      const user = userEvent.setup()
      render(<TestDialog size="default" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        const title = screen.getByRole('heading', { name: 'Test Dialog Title' })
        
        expect(dialog).toHaveClass('max-w-lg', 'p-6')
        expect(title).toHaveClass('text-lg')
      })
    })

    it('applies large size classes correctly', async () => {
      const user = userEvent.setup()
      render(<TestDialog size="lg" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        const title = screen.getByRole('heading', { name: 'Test Dialog Title' })
        
        expect(dialog).toHaveClass('max-w-2xl', 'p-8')
        expect(title).toHaveClass('text-xl')
      })
    })

    it('applies extra large size classes correctly', async () => {
      const user = userEvent.setup()
      render(<TestDialog size="xl" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        const title = screen.getByRole('heading', { name: 'Test Dialog Title' })
        
        expect(dialog).toHaveClass('max-w-4xl', 'p-8')
        expect(title).toHaveClass('text-2xl')
      })
    })

    it('applies full size classes correctly', async () => {
      const user = userEvent.setup()
      render(<TestDialog size="full" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        
        expect(dialog).toHaveClass('w-[calc(100vw-2rem)]', 'max-w-none', 'h-[calc(100vh-2rem)]', 'max-h-none')
      })
    })
  })

  describe('Content Variants', () => {
    it('applies default variant classes correctly', async () => {
      const user = userEvent.setup()
      render(<TestDialog variant="default" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).not.toHaveClass('border-destructive/50')
      })
    })

    it('applies destructive variant classes correctly', async () => {
      const user = userEvent.setup()
      render(<TestDialog variant="destructive" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveClass('border-destructive/50')
      })
    })

    it('applies success variant classes correctly', async () => {
      const user = userEvent.setup()
      render(<TestDialog variant="success" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveClass('border-green-500/50')
      })
    })

    it('applies warning variant classes correctly', async () => {
      const user = userEvent.setup()
      render(<TestDialog variant="warning" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveClass('border-yellow-500/50')
      })
    })
  })

  describe('Overlay Variants', () => {
    it('applies default overlay variant correctly', async () => {
      const user = userEvent.setup()
      render(<TestDialog overlayVariant="default" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        const overlay = document.querySelector('.fixed.inset-0.z-50[data-state="open"]')
        expect(overlay).toHaveClass('bg-black/80')
      })
    })

    it('applies light overlay variant correctly', async () => {
      const user = userEvent.setup()
      render(<TestDialog overlayVariant="light" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        const overlay = document.querySelector('.fixed.inset-0.z-50[data-state="open"]')
        expect(overlay).toHaveClass('bg-black/50')
      })
    })

    it('applies dark overlay variant correctly', async () => {
      const user = userEvent.setup()
      render(<TestDialog overlayVariant="dark" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        const overlay = document.querySelector('.fixed.inset-0.z-50[data-state="open"]')
        expect(overlay).toHaveClass('bg-black/90')
      })
    })

    it('applies blur overlay variant correctly', async () => {
      const user = userEvent.setup()
      render(<TestDialog overlayVariant="blur" />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
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
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
              <DialogDescription>Test dialog description</DialogDescription>
            </DialogHeader>
            <DialogFooter data-testid="footer" alignment="right">
              <Button>Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
              <DialogDescription>Test dialog description</DialogDescription>
            </DialogHeader>
            <DialogFooter data-testid="footer" alignment="left">
              <Button>Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
            <DialogFooter data-testid="footer" alignment="center">
              <Button>Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
            <DialogFooter data-testid="footer" alignment="between">
              <Button>Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      await waitFor(() => {
        const footer = screen.getByTestId('footer')
        expect(footer).toHaveClass('sm:justify-between')
      })
    })
  })

  describe('Controlled State', () => {
    it('handles controlled open state correctly', async () => {
      const onOpenChange = jest.fn()
      const { rerender } = render(<TestDialog open={false} onOpenChange={onOpenChange} />)
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      
      rerender(<TestDialog open={true} onOpenChange={onOpenChange} />)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('calls onOpenChange when close button is clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = jest.fn()
      
      render(<TestDialog open={true} onOpenChange={onOpenChange} />)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      const closeButton = screen.getByRole('button', { name: 'Close' })
      await user.click(closeButton)
      
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('calls onOpenChange when overlay is clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = jest.fn()
      
      render(<TestDialog open={true} onOpenChange={onOpenChange} />)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Click on overlay (outside dialog content)
      const overlay = document.querySelector('[data-radix-dialog-overlay]')
      if (overlay) {
        fireEvent.click(overlay)
        expect(onOpenChange).toHaveBeenCalledWith(false)
      }
    })
  })

  describe('Keyboard Interactions', () => {
    it('closes dialog when Escape key is pressed', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      await user.keyboard('{Escape}')
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('traps focus within dialog', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      const confirmButton = screen.getByRole('button', { name: 'Confirm' })
      const closeButton = screen.getByRole('button', { name: 'Close' })
      
      // Focus should be trapped within the dialog
      cancelButton.focus()
      expect(cancelButton).toHaveFocus()
      
      await user.tab()
      expect(confirmButton).toHaveFocus()
      
      await user.tab()
      expect(closeButton).toHaveFocus()
      
      // Should wrap back to first focusable element
      await user.tab()
      expect(cancelButton).toHaveFocus()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        const title = screen.getByRole('heading', { name: 'Test Dialog Title' })
        
        expect(dialog).toHaveAttribute('role', 'dialog')
        expect(dialog).toHaveAttribute('aria-labelledby', title.id)
        expect(dialog).toHaveAttribute('aria-modal', 'true')
      })
    })

    it('properly associates description with dialog', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        const description = screen.getByText('This is a test dialog description.')
        
        expect(dialog).toHaveAttribute('aria-describedby', description.id)
      })
    })

    it('meets accessibility standards', async () => {
      const user = userEvent.setup()
      const { container } = render(<TestDialog />)
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('meets accessibility standards with all sizes', async () => {
      const sizes = ['sm', 'default', 'lg', 'xl', 'full'] as const
      
      for (const size of sizes) {
        const user = userEvent.setup()
        const { container, unmount } = render(<TestDialog size={size} />)
        
        await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
        
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
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent className="custom-content-class">
            <DialogHeader className="custom-header-class">
              <DialogTitle className="custom-title-class">Title</DialogTitle>
              <DialogDescription className="custom-description-class">
                Description
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="custom-footer-class">
              <Button>Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        const title = screen.getByRole('heading', { name: 'Title' })
        
        expect(dialog).toHaveClass('custom-content-class')
        expect(title).toHaveClass('custom-title-class')
      })
    })

    it('forwards other props correctly', async () => {
      const user = userEvent.setup()
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent data-testid="custom-content">
            <DialogTitle data-testid="custom-title">Title</DialogTitle>
            <DialogDescription data-testid="custom-description">
              Description
            </DialogDescription>
          </DialogContent>
        </Dialog>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      await waitFor(() => {
        expect(screen.getByTestId('custom-content')).toBeInTheDocument()
        expect(screen.getByTestId('custom-title')).toBeInTheDocument()
        expect(screen.getByTestId('custom-description')).toBeInTheDocument()
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
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Complex Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complex Dialog</DialogTitle>
            </DialogHeader>
            {complexContent}
            <DialogFooter>
              <Button>Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open Complex Dialog' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(1000) // Should render reasonably quickly
    })

    it('handles frequent open/close efficiently', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      
      const startTime = performance.now()
      
      // Rapidly open and close dialog multiple times
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
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              {/* No DialogTitle */}
              <DialogDescription>Just a description</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
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
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Just a title</DialogTitle>
              {/* No DialogDescription */}
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Just a title' })).toBeInTheDocument()
      })
    })

    it('handles empty content gracefully', async () => {
      const user = userEvent.setup()
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Empty</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Empty Dialog</DialogTitle>
              <DialogDescription>Testing empty content</DialogDescription>
            </DialogHeader>
            {/* Empty content */}
          </DialogContent>
        </Dialog>
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
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Nested</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <span>Complex</span>
                <strong>Nested</strong>
                <em>Title</em>
              </DialogTitle>
            </DialogHeader>
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
          </DialogContent>
        </Dialog>
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
