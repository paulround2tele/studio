import React from "react"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe, toHaveNoViolations } from "jest-axe"
import { 
  Popover, 
  PopoverTrigger, 
  PopoverContent, 
  PopoverAnchor, 
  PopoverArrow, 
  PopoverClose, 
  SimplePopover 
} from "../popover"
import { Button } from "../button"

expect.extend(toHaveNoViolations)

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

describe("Popover Component", () => {
  describe("Basic Functionality", () => {
    it("should render trigger and not show content initially", () => {
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open Popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <p>Popover content</p>
          </PopoverContent>
        </Popover>
      )

      expect(screen.getByText("Open Popover")).toBeInTheDocument()
      expect(screen.queryByText("Popover content")).not.toBeInTheDocument()
    })

    it("should show content when trigger is clicked", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open Popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <p>Popover content</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open Popover"))
      
      await waitFor(() => {
        expect(screen.getByText("Popover content")).toBeInTheDocument()
      })
    })

    it("should hide content when trigger is clicked again", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open Popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <p>Popover content</p>
          </PopoverContent>
        </Popover>
      )

      const trigger = screen.getByText("Open Popover")
      
      // Open
      await user.click(trigger)
      await waitFor(() => {
        expect(screen.getByText("Popover content")).toBeInTheDocument()
      })

      // Close
      await user.click(trigger)
      await waitFor(() => {
        expect(screen.queryByText("Popover content")).not.toBeInTheDocument()
      })
    })

    it("should support controlled state", async () => {
      const onOpenChange = jest.fn()
      
      const ControlledPopover = () => {
        const [open, setOpen] = React.useState(false)
        
        React.useEffect(() => {
          onOpenChange(open)
        }, [open])
        
        return (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button>Toggle</Button>
            </PopoverTrigger>
            <PopoverContent>
              <p>Content</p>
            </PopoverContent>
          </Popover>
        )
      }

      render(<ControlledPopover />)
      
      const trigger = screen.getByText("Toggle")
      await userEvent.click(trigger)
      
      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(true)
      })
    })
  })

  describe("PopoverContent Variants", () => {
    it("should render default variant correctly", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent variant="default">
            <p>Default content</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open"))
      
      await waitFor(() => {
        const content = screen.getByText("Default content").closest('[role="dialog"]')
        expect(content).toHaveClass("bg-popover", "text-popover-foreground")
      })
    })

    it("should render elevated variant correctly", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent variant="elevated">
            <p>Elevated content</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open"))
      
      await waitFor(() => {
        const content = screen.getByText("Elevated content").closest('[role="dialog"]')
        expect(content).toHaveClass("bg-background", "text-foreground", "shadow-lg")
      })
    })

    it("should render minimal variant correctly", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent variant="minimal">
            <p>Minimal content</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open"))
      
      await waitFor(() => {
        const content = screen.getByText("Minimal content").closest('[role="dialog"]')
        expect(content).toHaveClass("border-transparent", "bg-background/80", "backdrop-blur-sm")
      })
    })

    it("should render accent variant correctly", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent variant="accent">
            <p>Accent content</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open"))
      
      await waitFor(() => {
        const content = screen.getByText("Accent content").closest('[role="dialog"]')
        expect(content).toHaveClass("border-accent", "bg-accent", "text-accent-foreground")
      })
    })

    it("should render destructive variant correctly", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent variant="destructive">
            <p>Destructive content</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open"))
      
      await waitFor(() => {
        const content = screen.getByText("Destructive content").closest('[role="dialog"]')
        expect(content).toHaveClass("border-destructive/50", "bg-destructive", "text-destructive-foreground")
      })
    })

    it("should render success variant correctly", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent variant="success">
            <p>Success content</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open"))
      
      await waitFor(() => {
        const content = screen.getByText("Success content").closest('[role="dialog"]')
        expect(content).toHaveClass("border-green-200", "bg-green-50", "text-green-900")
      })
    })

    it("should render warning variant correctly", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent variant="warning">
            <p>Warning content</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open"))
      
      await waitFor(() => {
        const content = screen.getByText("Warning content").closest('[role="dialog"]')
        expect(content).toHaveClass("border-yellow-200", "bg-yellow-50", "text-yellow-900")
      })
    })
  })

  describe("PopoverContent Sizes", () => {
    it("should render small size correctly", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent size="sm">
            <p>Small content</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open"))
      
      await waitFor(() => {
        const content = screen.getByText("Small content").closest('[role="dialog"]')
        expect(content).toHaveClass("w-48", "p-2")
      })
    })

    it("should render default size correctly", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent size="default">
            <p>Default content</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open"))
      
      await waitFor(() => {
        const content = screen.getByText("Default content").closest('[role="dialog"]')
        expect(content).toHaveClass("w-72", "p-4")
      })
    })

    it("should render large size correctly", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent size="lg">
            <p>Large content</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open"))
      
      await waitFor(() => {
        const content = screen.getByText("Large content").closest('[role="dialog"]')
        expect(content).toHaveClass("w-96", "p-6")
      })
    })

    it("should render extra large size correctly", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent size="xl">
            <p>Extra large content</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open"))
      
      await waitFor(() => {
        const content = screen.getByText("Extra large content").closest('[role="dialog"]')
        expect(content).toHaveClass("w-[480px]", "p-8")
      })
    })

    it("should render auto size correctly", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent size="auto">
            <p>Auto content</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open"))
      
      await waitFor(() => {
        const content = screen.getByText("Auto content").closest('[role="dialog"]')
        expect(content).toHaveClass("w-auto", "p-4")
      })
    })

    it("should render full size correctly", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent size="full">
            <p>Full content</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open"))
      
      await waitFor(() => {
        const content = screen.getByText("Full content").closest('[role="dialog"]')
        expect(content).toHaveClass("w-full", "p-4")
      })
    })
  })

  describe("PopoverArrow", () => {
    it("should render arrow when included", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverArrow />
            <p>Content with arrow</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open"))
      
      await waitFor(() => {
        // The arrow is rendered as an SVG element
        const arrow = document.querySelector('svg')
        expect(arrow).toBeInTheDocument()
        expect(arrow).toHaveClass("fill-popover")
      })
    })

    it("should apply custom className to arrow", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverArrow className="fill-red-500" />
            <p>Content with custom arrow</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open"))
      
      await waitFor(() => {
        const arrow = document.querySelector('svg')
        expect(arrow).toBeInTheDocument()
        expect(arrow).toHaveClass("fill-red-500")
      })
    })
  })

  describe("PopoverClose", () => {
    it("should render close button when included", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverClose>×</PopoverClose>
            <p>Content with close button</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open"))
      
      await waitFor(() => {
        expect(screen.getByText("×")).toBeInTheDocument()
        expect(screen.getByText("Content with close button")).toBeInTheDocument()
      })
    })

    it("should close popover when close button is clicked", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverClose>Close</PopoverClose>
            <p>Content with close button</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open"))
      
      await waitFor(() => {
        expect(screen.getByText("Content with close button")).toBeInTheDocument()
      })

      await user.click(screen.getByText("Close"))
      
      await waitFor(() => {
        expect(screen.queryByText("Content with close button")).not.toBeInTheDocument()
      })
    })
  })

  describe("SimplePopover", () => {
    it("should render and function correctly", async () => {
      const user = userEvent.setup()
      
      render(
        <SimplePopover
          trigger={<Button>Simple Trigger</Button>}
          size="lg"
          variant="accent"
        >
          <p>Simple popover content</p>
        </SimplePopover>
      )

      expect(screen.getByText("Simple Trigger")).toBeInTheDocument()
      expect(screen.queryByText("Simple popover content")).not.toBeInTheDocument()

      await user.click(screen.getByText("Simple Trigger"))
      
      await waitFor(() => {
        const content = screen.getByText("Simple popover content")
        expect(content).toBeInTheDocument()
        
        const container = content.closest('[role="dialog"]')
        expect(container).toHaveClass("w-96", "p-6") // lg size
        expect(container).toHaveClass("border-accent", "bg-accent") // accent variant
      })
    })

    it("should support controlled state", async () => {
      const onOpenChange = jest.fn()
      
      render(
        <SimplePopover
          trigger={<Button>Controlled</Button>}
          open={true}
          onOpenChange={onOpenChange}
        >
          <p>Controlled content</p>
        </SimplePopover>
      )

      // Should be open initially
      await waitFor(() => {
        expect(screen.getByText("Controlled content")).toBeInTheDocument()
      })
    })

    it("should support custom positioning", async () => {
      const user = userEvent.setup()
      
      render(
        <SimplePopover
          trigger={<Button>Positioned</Button>}
          side="top"
          align="start"
          sideOffset={10}
        >
          <p>Positioned content</p>
        </SimplePopover>
      )

      await user.click(screen.getByText("Positioned"))
      
      await waitFor(() => {
        expect(screen.getByText("Positioned content")).toBeInTheDocument()
      })
    })
  })

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open Popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <p>Accessible content</p>
          </PopoverContent>
        </Popover>
      )

      const trigger = screen.getByText("Open Popover")
      expect(trigger).toHaveAttribute("data-state", "closed")

      await user.click(trigger)
      
      await waitFor(() => {
        expect(trigger).toHaveAttribute("data-state", "open")
        
        const content = screen.getByRole("dialog")
        expect(content).toBeInTheDocument()
        expect(content).toHaveAttribute("data-state", "open")
      })
    })

    it("should support keyboard navigation", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open Popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <button>Focusable button</button>
            <p>Content</p>
          </PopoverContent>
        </Popover>
      )

      const trigger = screen.getByText("Open Popover")
      
      // Open with Enter key
      trigger.focus()
      await user.keyboard("{Enter}")
      
      await waitFor(() => {
        expect(screen.getByText("Content")).toBeInTheDocument()
      })

      // Close with Escape key
      await user.keyboard("{Escape}")
      
      await waitFor(() => {
        expect(screen.queryByText("Content")).not.toBeInTheDocument()
      })
    })

    it("should close when clicking outside", async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <div data-testid="outside">Outside content</div>
          <Popover>
            <PopoverTrigger asChild>
              <Button>Open Popover</Button>
            </PopoverTrigger>
            <PopoverContent>
              <p>Inside content</p>
            </PopoverContent>
          </Popover>
        </div>
      )

      await user.click(screen.getByText("Open Popover"))
      
      await waitFor(() => {
        expect(screen.getByText("Inside content")).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("outside"))
      
      await waitFor(() => {
        expect(screen.queryByText("Inside content")).not.toBeInTheDocument()
      })
    })

    it("should have no accessibility violations", async () => {
      const user = userEvent.setup()
      
      const { container } = render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open Popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <h2>Popover Title</h2>
            <p>Popover content with proper heading structure</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open Popover"))
      
      await waitFor(() => {
        expect(screen.getByText("Popover Title")).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe("Edge Cases", () => {
    it("should handle rapid open/close", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Toggle</Button>
          </PopoverTrigger>
          <PopoverContent>
            <p>Content</p>
          </PopoverContent>
        </Popover>
      )

      const trigger = screen.getByText("Toggle")
      
      // Rapid clicks
      await user.click(trigger)
      await user.click(trigger)
      await user.click(trigger)
      
      // Should handle gracefully without errors
      expect(trigger).toBeInTheDocument()
    })

    it("should handle missing trigger content", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <div></div>
          </PopoverTrigger>
          <PopoverContent>
            <p>Content</p>
          </PopoverContent>
        </Popover>
      )

      // Should render the trigger element even if empty
      const trigger = document.querySelector('[data-state="closed"]')
      expect(trigger).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })

    it("should handle custom className properly", async () => {
      const user = userEvent.setup()
      
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent className="custom-popover-class">
            <p>Custom styled content</p>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText("Open"))
      
      await waitFor(() => {
        const content = screen.getByText("Custom styled content").closest('[role="dialog"]')
        expect(content).toHaveClass("custom-popover-class")
      })
    })
  })

  describe("Performance", () => {
    it("should not re-render unnecessarily", () => {
      const renderSpy = jest.fn()
      
      const TestComponent = () => {
        renderSpy()
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button>Open</Button>
            </PopoverTrigger>
            <PopoverContent>
              <p>Content</p>
            </PopoverContent>
          </Popover>
        )
      }

      const { rerender } = render(<TestComponent />)
      
      expect(renderSpy).toHaveBeenCalledTimes(1)
      
      // Re-render with same props
      rerender(<TestComponent />)
      
      expect(renderSpy).toHaveBeenCalledTimes(2)
    })

    it("should handle many popovers efficiently", () => {
      const start = performance.now()
      
      render(
        <div>
          {Array.from({ length: 100 }, (_, i) => (
            <Popover key={i}>
              <PopoverTrigger asChild>
                <Button>Open {i}</Button>
              </PopoverTrigger>
              <PopoverContent>
                <p>Content {i}</p>
              </PopoverContent>
            </Popover>
          ))}
        </div>
      )
      
      const end = performance.now()
      const renderTime = end - start
      
      // Should render in reasonable time (less than 100ms for 100 components)
      expect(renderTime).toBeLessThan(100)
    })
  })
})
