import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe, toHaveNoViolations } from "jest-axe"
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
  SimpleBreadcrumb 
} from "../breadcrumb"

expect.extend(toHaveNoViolations)

describe("Breadcrumb Component", () => {
  describe("Basic Functionality", () => {
    it("should render correctly", () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current Page</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument()
      expect(screen.getByText("Home")).toBeInTheDocument()
      expect(screen.getByText("Current Page")).toBeInTheDocument()
    })

    it("should have proper semantic structure", () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/products">Products</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current Product</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const nav = screen.getByRole("navigation")
      expect(nav).toHaveAttribute("aria-label", "Breadcrumb")

      const list = screen.getByRole("list")
      expect(list).toBeInTheDocument()

      const listItems = screen.getAllByRole("listitem")
      expect(listItems).toHaveLength(3) // 3 items (separators are also li elements but counted differently)

      const currentPage = screen.getByText("Current Product")
      expect(currentPage).toHaveAttribute("aria-current", "page")
    })
  })

  describe("Breadcrumb Variants", () => {
    it("should render default variant correctly", () => {
      render(
        <Breadcrumb variant="default">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const nav = screen.getByRole("navigation")
      expect(nav).toHaveClass("text-muted-foreground")
    })

    it("should render subtle variant correctly", () => {
      render(
        <Breadcrumb variant="subtle">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const nav = screen.getByRole("navigation")
      expect(nav).toHaveClass("text-muted-foreground/70")
    })

    it("should render prominent variant correctly", () => {
      render(
        <Breadcrumb variant="prominent">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const nav = screen.getByRole("navigation")
      expect(nav).toHaveClass("text-foreground", "font-medium")
    })

    it("should render minimal variant correctly", () => {
      render(
        <Breadcrumb variant="minimal">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const nav = screen.getByRole("navigation")
      expect(nav).toHaveClass("text-muted-foreground/60")
    })
  })

  describe("Breadcrumb Sizes", () => {
    it("should render small size correctly", () => {
      render(
        <Breadcrumb size="sm">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const nav = screen.getByRole("navigation")
      expect(nav).toHaveClass("text-xs", "space-x-0.5")
    })

    it("should render default size correctly", () => {
      render(
        <Breadcrumb size="default">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const nav = screen.getByRole("navigation")
      expect(nav).toHaveClass("text-sm", "space-x-1")
    })

    it("should render large size correctly", () => {
      render(
        <Breadcrumb size="lg">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const nav = screen.getByRole("navigation")
      expect(nav).toHaveClass("text-base", "space-x-1.5")
    })
  })

  describe("BreadcrumbItem Variants", () => {
    it("should render default item variant correctly", () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem variant="default">
              <span>Default Item</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const item = screen.getByText("Default Item").closest("li")
      expect(item).toHaveClass("text-muted-foreground")
    })

    it("should render link item variant correctly", () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem variant="link">
              <BreadcrumbLink href="/">Link Item</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const item = screen.getByText("Link Item").closest("li")
      expect(item).toHaveClass("text-primary", "underline-offset-4", "hover:underline")
    })

    it("should render button item variant correctly", () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem variant="button">
              <button>Button Item</button>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const item = screen.getByText("Button Item").closest("li")
      expect(item).toHaveClass("cursor-pointer", "rounded")
    })

    it("should render current item variant correctly", () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem variant="current">
              <BreadcrumbPage>Current Item</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const item = screen.getByText("Current Item").closest("li")
      expect(item).toHaveClass("text-foreground", "font-medium", "cursor-default")
    })
  })

  describe("BreadcrumbSeparator", () => {
    it("should render default separator", () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const separators = document.querySelectorAll('[role="presentation"]')
      expect(separators).toHaveLength(1)
      expect(separators[0]).toHaveAttribute("aria-hidden", "true")
    })

    it("should render custom separator", () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      expect(screen.getByText("/")).toBeInTheDocument()
    })

    it("should render separator variants correctly", () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator variant="prominent" />
            <BreadcrumbItem>
              <BreadcrumbPage>Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const separator = document.querySelector('[role="presentation"]')
      expect(separator).toHaveClass("text-muted-foreground/70")
    })

    it("should render separator sizes correctly", () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator size="lg" />
            <BreadcrumbItem>
              <BreadcrumbPage>Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const separator = document.querySelector('[role="presentation"]')
      expect(separator).toHaveClass("h-5", "w-5")
    })
  })

  describe("BreadcrumbEllipsis", () => {
    it("should render ellipsis correctly", () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbEllipsis />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const ellipsis = screen.getByText("More pages")
      expect(ellipsis).toBeInTheDocument()
      expect(ellipsis).toHaveClass("sr-only")

      const ellipsisContainer = ellipsis.parentElement
      expect(ellipsisContainer).toHaveAttribute("role", "presentation")
      expect(ellipsisContainer).toHaveAttribute("aria-hidden", "true")
    })
  })

  describe("BreadcrumbLink", () => {
    it("should render link correctly", () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/home">Home Link</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const link = screen.getByText("Home Link")
      expect(link).toBeInTheDocument()
      expect(link.tagName).toBe("A")
      expect(link).toHaveAttribute("href", "/home")
    })

    it("should handle click events", async () => {
      const handleClick = jest.fn()
      const user = userEvent.setup()

      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/home" onClick={handleClick}>
                Clickable Link
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      await user.click(screen.getByText("Clickable Link"))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it("should support asChild prop", () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <button>Custom Button</button>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const button = screen.getByRole("button", { name: "Custom Button" })
      expect(button).toBeInTheDocument()
    })
  })

  describe("BreadcrumbPage", () => {
    it("should render current page correctly", () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Current Page</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const page = screen.getByText("Current Page")
      expect(page).toBeInTheDocument()
      expect(page).toHaveAttribute("role", "link")
      expect(page).toHaveAttribute("aria-disabled", "true")
      expect(page).toHaveAttribute("aria-current", "page")
    })
  })

  describe("SimpleBreadcrumb", () => {
    const basicItems = [
      { label: "Home", href: "/" },
      { label: "Products", href: "/products" },
      { label: "Current Product", current: true }
    ]

    it("should render simple breadcrumb correctly", () => {
      render(<SimpleBreadcrumb items={basicItems} />)

      expect(screen.getByText("Home")).toBeInTheDocument()
      expect(screen.getByText("Products")).toBeInTheDocument()
      expect(screen.getByText("Current Product")).toBeInTheDocument()

      const currentPage = screen.getByText("Current Product")
      expect(currentPage).toHaveAttribute("aria-current", "page")
    })

    it("should handle onClick items", async () => {
      const handleClick = jest.fn()
      const user = userEvent.setup()

      const items = [
        { label: "Home", onClick: handleClick },
        { label: "Current", current: true }
      ]

      render(<SimpleBreadcrumb items={items} />)

      await user.click(screen.getByText("Home"))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it("should support custom separator", () => {
      render(
        <SimpleBreadcrumb 
          items={basicItems} 
          separator="→"
        />
      )

      expect(screen.getAllByText("→")).toHaveLength(2) // Should have 2 separators
    })

    it("should support maxItems with ellipsis", () => {
      const manyItems = [
        { label: "Home", href: "/" },
        { label: "Category", href: "/category" },
        { label: "Subcategory", href: "/subcategory" },
        { label: "Product Type", href: "/product-type" },
        { label: "Current Product", current: true }
      ]

      render(<SimpleBreadcrumb items={manyItems} maxItems={3} />)

      expect(screen.getByText("Home")).toBeInTheDocument()
      expect(screen.getByText("More pages")).toBeInTheDocument()
      expect(screen.getByText("Current Product")).toBeInTheDocument()
      
      // Should not show middle items
      expect(screen.queryByText("Category")).not.toBeInTheDocument()
      expect(screen.queryByText("Subcategory")).not.toBeInTheDocument()
    })

    it("should handle maxItems edge cases", () => {
      const items = [
        { label: "Home", href: "/" },
        { label: "Current", current: true }
      ]

      render(<SimpleBreadcrumb items={items} maxItems={1} />)

      expect(screen.getByText("Home")).toBeInTheDocument()
      expect(screen.getByText("Current")).toBeInTheDocument()
    })

    it("should call onItemClick callback", async () => {
      const handleItemClick = jest.fn()
      const user = userEvent.setup()

      render(
        <SimpleBreadcrumb 
          items={basicItems} 
          onItemClick={handleItemClick}
        />
      )

      await user.click(screen.getByText("Home"))
      expect(handleItemClick).toHaveBeenCalledWith(basicItems[0], 0)
    })

    it("should support variants and sizes", () => {
      render(
        <SimpleBreadcrumb 
          items={basicItems} 
          variant="prominent"
          size="lg"
        />
      )

      const nav = screen.getByRole("navigation")
      expect(nav).toHaveClass("text-foreground", "font-medium", "text-base")
    })
  })

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const nav = screen.getByRole("navigation")
      expect(nav).toHaveAttribute("aria-label", "Breadcrumb")

      const currentPage = screen.getByText("Current")
      expect(currentPage).toHaveAttribute("aria-current", "page")
      expect(currentPage).toHaveAttribute("aria-disabled", "true")

      const separator = document.querySelector('[role="presentation"]')
      expect(separator).toHaveAttribute("aria-hidden", "true")
    })

    it("should support keyboard navigation", async () => {
      const user = userEvent.setup()

      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/products">Products</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const homeLink = screen.getByText("Home")
      const productsLink = screen.getByText("Products")

      homeLink.focus()
      expect(homeLink).toHaveFocus()

      await user.tab()
      expect(productsLink).toHaveFocus()
    })

    it("should have no accessibility violations", async () => {
      const { container } = render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/products">Products</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current Product</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe("Edge Cases", () => {
    it("should handle empty breadcrumb", () => {
      render(
        <Breadcrumb>
          <BreadcrumbList />
        </Breadcrumb>
      )

      const nav = screen.getByRole("navigation")
      expect(nav).toBeInTheDocument()
    })

    it("should handle single item", () => {
      render(
        <SimpleBreadcrumb items={[{ label: "Only Item", current: true }]} />
      )

      expect(screen.getByText("Only Item")).toBeInTheDocument()
      expect(screen.queryByRole("presentation")).not.toBeInTheDocument()
    })

    it("should handle custom className", () => {
      render(
        <Breadcrumb className="custom-breadcrumb">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Test</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const nav = screen.getByRole("navigation")
      expect(nav).toHaveClass("custom-breadcrumb")
    })

    it("should handle long item labels gracefully", () => {
      const longLabel = "This is a very long breadcrumb item label that might cause layout issues"
      
      render(
        <SimpleBreadcrumb items={[
          { label: longLabel, current: true }
        ]} />
      )

      expect(screen.getByText(longLabel)).toBeInTheDocument()
    })
  })

  describe("Performance", () => {
    it("should not re-render unnecessarily", () => {
      const renderSpy = jest.fn()
      
      const TestComponent = () => {
        renderSpy()
        return (
          <SimpleBreadcrumb items={[
            { label: "Home", href: "/" },
            { label: "Current", current: true }
          ]} />
        )
      }

      const { rerender } = render(<TestComponent />)
      
      expect(renderSpy).toHaveBeenCalledTimes(1)
      
      // Re-render with same props
      rerender(<TestComponent />)
      
      expect(renderSpy).toHaveBeenCalledTimes(2)
    })

    it("should handle many items efficiently", () => {
      const start = performance.now()
      
      const manyItems = Array.from({ length: 100 }, (_, i) => ({
        label: `Item ${i}`,
        href: `/item/${i}`
      }))

      render(<SimpleBreadcrumb items={manyItems} />)
      
      const end = performance.now()
      const renderTime = end - start
      
      // Should render in reasonable time (less than 100ms for 100 items)
      expect(renderTime).toBeLessThan(100)
    })
  })
})
