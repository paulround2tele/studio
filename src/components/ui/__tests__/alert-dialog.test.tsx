import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import '@testing-library/jest-dom'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../alert-dialog'

expect.extend(toHaveNoViolations)

// Test component wrapper
const AlertDialogTest = ({
  open,
  onOpenChange,
  variant = 'default',
  size = 'default',
  blur = 'none',
  headerVariant = 'default',
  justify = 'end',
  titleSize = 'default',
  actionVariant = 'default',
  cancelVariant = 'outline',
  children,
  ...props
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  variant?: 'default' | 'destructive' | 'warning' | 'success'
  size?: 'sm' | 'default' | 'lg' | 'xl'
  blur?: 'none' | 'sm' | 'md' | 'lg'
  headerVariant?: 'default' | 'destructive' | 'warning' | 'success'
  justify?: 'start' | 'center' | 'end' | 'between'
  titleSize?: 'sm' | 'default' | 'lg' | 'xl'
  actionVariant?: any
  cancelVariant?: any
  children?: React.ReactNode
} & React.ComponentProps<typeof AlertDialog>) => {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const openState = isControlled ? open : internalOpen
  
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (isControlled && onOpenChange) {
      onOpenChange(newOpen)
    } else if (!isControlled) {
      setInternalOpen(newOpen)
    }
  }, [isControlled, onOpenChange])
  
  return (
    <AlertDialog open={openState} onOpenChange={handleOpenChange} {...props}>
      <AlertDialogTrigger asChild>
        <button>Open Alert</button>
      </AlertDialogTrigger>
      <AlertDialogContent variant={variant} size={size}>
        <AlertDialogHeader variant={headerVariant}>
          <AlertDialogTitle size={titleSize}>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter justify={justify}>
          <AlertDialogCancel variant={cancelVariant}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={actionVariant}>Continue</AlertDialogAction>
        </AlertDialogFooter>
        {children}
      </AlertDialogContent>
    </AlertDialog>
  )
}

describe('AlertDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Basic functionality tests
  describe('Basic functionality', () => {
    it('renders trigger button', () => {
      render(<AlertDialogTest />)
      expect(screen.getByRole('button', { name: 'Open Alert' })).toBeInTheDocument()
    })

    it('opens dialog when trigger is clicked', async () => {
      render(<AlertDialogTest />)
      
      const trigger = screen.getByRole('button', { name: 'Open Alert' })
      fireEvent.click(trigger)
      
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })
      expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument()
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument()
    })

    it('shows action and cancel buttons in dialog', async () => {
      render(<AlertDialogTest />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
      })
    })

    it('closes dialog when cancel is clicked', async () => {
      const onOpenChange = jest.fn()
      render(<AlertDialogTest open={true} onOpenChange={onOpenChange} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('closes dialog when action is clicked', async () => {
      const onOpenChange = jest.fn()
      render(<AlertDialogTest open={true} onOpenChange={onOpenChange} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('closes dialog when escape key is pressed', async () => {
      const onOpenChange = jest.fn()
      render(<AlertDialogTest open={true} onOpenChange={onOpenChange} />)
      
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })
      
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('can be controlled with open prop', () => {
      const { rerender } = render(<AlertDialogTest open={false} />)
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      
      rerender(<AlertDialogTest open={true} />)
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })
  })

  // Content variant tests
  describe('Content variants', () => {
    it('applies default variant styles', async () => {
      render(<AlertDialogTest variant="default" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('alertdialog')
        expect(dialog).not.toHaveClass('border-destructive/50', 'text-destructive')
      })
    })

    it('applies destructive variant styles', async () => {
      render(<AlertDialogTest variant="destructive" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('alertdialog')
        expect(dialog).toHaveClass('border-destructive/50', 'text-destructive')
      })
    })

    it('applies warning variant styles', async () => {
      render(<AlertDialogTest variant="warning" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('alertdialog')
        expect(dialog).toHaveClass('border-yellow-500/50', 'text-yellow-700')
      })
    })

    it('applies success variant styles', async () => {
      render(<AlertDialogTest variant="success" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('alertdialog')
        expect(dialog).toHaveClass('border-green-500/50', 'text-green-700')
      })
    })
  })

  // Size variant tests
  describe('Size variants', () => {
    it('applies small size styles', async () => {
      render(<AlertDialogTest size="sm" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('alertdialog')
        expect(dialog).toHaveClass('max-w-md', 'p-4')
      })
    })

    it('applies default size styles', async () => {
      render(<AlertDialogTest size="default" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('alertdialog')
        expect(dialog).toHaveClass('max-w-lg', 'p-6')
      })
    })

    it('applies large size styles', async () => {
      render(<AlertDialogTest size="lg" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('alertdialog')
        expect(dialog).toHaveClass('max-w-2xl', 'p-8')
      })
    })

    it('applies extra large size styles', async () => {
      render(<AlertDialogTest size="xl" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('alertdialog')
        expect(dialog).toHaveClass('max-w-4xl', 'p-10')
      })
    })
  })

  // Header variant tests
  describe('Header variants', () => {
    it('applies default header variant', async () => {
      render(<AlertDialogTest headerVariant="default" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const header = screen.getByText('Are you absolutely sure?').parentElement
        expect(header).not.toHaveClass('text-destructive', 'text-yellow-700', 'text-green-700')
      })
    })

    it('applies destructive header variant', async () => {
      render(<AlertDialogTest headerVariant="destructive" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const header = screen.getByText('Are you absolutely sure?').parentElement
        expect(header).toHaveClass('text-destructive')
      })
    })

    it('applies warning header variant', async () => {
      render(<AlertDialogTest headerVariant="warning" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const header = screen.getByText('Are you absolutely sure?').parentElement
        expect(header).toHaveClass('text-yellow-700')
      })
    })

    it('applies success header variant', async () => {
      render(<AlertDialogTest headerVariant="success" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const header = screen.getByText('Are you absolutely sure?').parentElement
        expect(header).toHaveClass('text-green-700')
      })
    })
  })

  // Footer justification tests
  describe('Footer justification', () => {
    it('applies start justification', async () => {
      render(<AlertDialogTest justify="start" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const footer = screen.getByRole('button', { name: 'Cancel' }).parentElement
        expect(footer).toHaveClass('sm:justify-start')
      })
    })

    it('applies center justification', async () => {
      render(<AlertDialogTest justify="center" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const footer = screen.getByRole('button', { name: 'Cancel' }).parentElement
        expect(footer).toHaveClass('sm:justify-center')
      })
    })

    it('applies end justification (default)', async () => {
      render(<AlertDialogTest justify="end" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const footer = screen.getByRole('button', { name: 'Cancel' }).parentElement
        expect(footer).toHaveClass('sm:justify-end')
      })
    })

    it('applies between justification', async () => {
      render(<AlertDialogTest justify="between" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const footer = screen.getByRole('button', { name: 'Cancel' }).parentElement
        expect(footer).toHaveClass('sm:justify-between')
      })
    })
  })

  // Title size tests
  describe('Title sizes', () => {
    it('applies small title size', async () => {
      render(<AlertDialogTest titleSize="sm" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const title = screen.getByText('Are you absolutely sure?')
        expect(title).toHaveClass('text-base')
      })
    })

    it('applies default title size', async () => {
      render(<AlertDialogTest titleSize="default" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const title = screen.getByText('Are you absolutely sure?')
        expect(title).toHaveClass('text-lg')
      })
    })

    it('applies large title size', async () => {
      render(<AlertDialogTest titleSize="lg" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const title = screen.getByText('Are you absolutely sure?')
        expect(title).toHaveClass('text-xl')
      })
    })

    it('applies extra large title size', async () => {
      render(<AlertDialogTest titleSize="xl" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const title = screen.getByText('Are you absolutely sure?')
        expect(title).toHaveClass('text-2xl')
      })
    })
  })

  // Button variant tests
  describe('Button variants', () => {
    it('applies default action button variant', async () => {
      render(<AlertDialogTest actionVariant="default" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const actionButton = screen.getByRole('button', { name: 'Continue' })
        expect(actionButton).toHaveClass('bg-primary', 'text-primary-foreground')
      })
    })

    it('applies destructive action button variant', async () => {
      render(<AlertDialogTest actionVariant="destructive" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const actionButton = screen.getByRole('button', { name: 'Continue' })
        expect(actionButton).toHaveClass('bg-destructive', 'text-destructive-foreground')
      })
    })

    it('applies outline cancel button variant (default)', async () => {
      render(<AlertDialogTest cancelVariant="outline" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: 'Cancel' })
        expect(cancelButton).toHaveClass('border', 'border-input')
      })
    })

    it('applies ghost cancel button variant', async () => {
      render(<AlertDialogTest cancelVariant="ghost" />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: 'Cancel' })
        expect(cancelButton).toHaveClass('hover:bg-accent')
      })
    })
  })

  // Accessibility tests
  describe('Accessibility', () => {
    it('has proper ARIA attributes', async () => {
      render(<AlertDialogTest />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        const dialog = screen.getByRole('alertdialog')
        const title = screen.getByText('Are you absolutely sure?')
        const description = screen.getByText(/This action cannot be undone/)
        
        expect(dialog).toHaveAttribute('aria-labelledby', title.id)
        expect(dialog).toHaveAttribute('aria-describedby', description.id)
      })
    })

    it('should not have accessibility violations', async () => {
      const { container } = render(<AlertDialogTest />)
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Alert' }))
      
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  // Edge cases and error handling
  describe('Edge cases', () => {
    it('handles missing title gracefully', async () => {
      render(
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button>Open</button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogDescription>
              Description only dialog
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )
      
      fireEvent.click(screen.getByRole('button', { name: 'Open' }))
      
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
        expect(screen.getByText('Description only dialog')).toBeInTheDocument()
      })
    })

    it('handles missing description gracefully', async () => {
      render(
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button>Open</button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Title only</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )
      
      fireEvent.click(screen.getByRole('button', { name: 'Open' }))
      
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
        expect(screen.getByText('Title only')).toBeInTheDocument()
      })
    })

    it('handles action only footer', async () => {
      render(
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button>Open</button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )
      
      fireEvent.click(screen.getByRole('button', { name: 'Open' }))
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
      })
    })

    it('handles custom content', async () => {
      render(
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button>Open</button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <div data-testid="custom-content">Custom content here</div>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )
      
      fireEvent.click(screen.getByRole('button', { name: 'Open' }))
      
      await waitFor(() => {
        expect(screen.getByTestId('custom-content')).toBeInTheDocument()
      })
    })

    it('handles multiple dialogs', async () => {
      render(
        <div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button>Open Dialog 1</button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Dialog 1</AlertDialogTitle>
              <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button>Open Dialog 2</button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Dialog 2</AlertDialogTitle>
              <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Dialog 1' }))
      await waitFor(() => {
        expect(screen.getByText('Dialog 1')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      
      fireEvent.click(screen.getByRole('button', { name: 'Open Dialog 2' }))
      await waitFor(() => {
        expect(screen.getByText('Dialog 2')).toBeInTheDocument()
      })
    })
  })

  // Performance tests
  describe('Performance', () => {
    it('renders efficiently with many re-renders', () => {
      const { rerender } = render(<AlertDialogTest />)
      
      // Multiple re-renders shouldn't cause issues
      for (let i = 0; i < 10; i++) {
        rerender(<AlertDialogTest variant="default" />)
        rerender(<AlertDialogTest variant="destructive" />)
      }
      
      expect(screen.getByRole('button', { name: 'Open Alert' })).toBeInTheDocument()
    })

    it('handles rapid open/close operations', async () => {
      const onOpenChange = jest.fn()
      const { rerender } = render(<AlertDialogTest open={false} onOpenChange={onOpenChange} />)
      
      // Open dialog
      rerender(<AlertDialogTest open={true} onOpenChange={onOpenChange} />)
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })
      
      // Trigger close via escape
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
      expect(onOpenChange).toHaveBeenCalledWith(false)
      
      // Simulate close
      rerender(<AlertDialogTest open={false} onOpenChange={onOpenChange} />)
      
      // Open again
      rerender(<AlertDialogTest open={true} onOpenChange={onOpenChange} />)
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })
      
      // Close again
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
      
      expect(onOpenChange).toHaveBeenCalledTimes(2)
    })
  })
})
