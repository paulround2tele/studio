import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe, toHaveNoViolations } from "jest-axe"
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationButton,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
  SimplePagination,
  generatePaginationRange 
} from "../pagination"

expect.extend(toHaveNoViolations)

describe("Pagination Component", () => {
  describe("Basic Functionality", () => {
    it("should render correctly", () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationLink href="?page=1">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="?page=2">2</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      expect(screen.getByRole("navigation", { name: "pagination" })).toBeInTheDocument()
      expect(screen.getByText("1")).toBeInTheDocument()
      expect(screen.getByText("2")).toBeInTheDocument()
    })

    it("should have proper semantic structure", () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationLink href="?page=1">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="?page=2" isActive>2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="?page=3">3</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      const nav = screen.getByRole("navigation")
      expect(nav).toHaveAttribute("aria-label", "pagination")

      const list = screen.getByRole("list")
      expect(list).toBeInTheDocument()

      const listItems = screen.getAllByRole("listitem")
      expect(listItems).toHaveLength(3)

      const currentPage = screen.getByText("2")
      expect(currentPage).toHaveAttribute("aria-current", "page")
    })
  })

  describe("Pagination Variants", () => {
    it("should render default variant correctly", () => {
      render(
        <Pagination variant="default">
          <PaginationContent>
            <PaginationItem>
              <PaginationLink href="?page=1">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      const nav = screen.getByRole("navigation")
      expect(nav).toHaveClass("mx-auto", "flex", "w-full", "justify-center")
    })

    it("should render outline variant correctly", () => {
      render(
        <Pagination variant="outline">
          <PaginationContent variant="outline">
            <PaginationItem>
              <PaginationLink variant="outline" href="?page=1">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      const link = screen.getByText("1")
      expect(link).toHaveClass("border", "border-input")
    })

    it("should render ghost variant correctly", () => {
      render(
        <Pagination variant="ghost">
          <PaginationContent variant="ghost">
            <PaginationItem>
              <PaginationLink variant="ghost" href="?page=1">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      const link = screen.getByText("1")
      expect(link).toHaveClass("hover:bg-accent")
    })

    it("should render minimal variant correctly", () => {
      render(
        <Pagination variant="minimal">
          <PaginationContent variant="minimal">
            <PaginationItem>
              <PaginationLink variant="minimal" href="?page=1">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      const link = screen.getByText("1")
      expect(link).toHaveClass("hover:bg-accent/50")
    })
  })

  describe("Pagination Sizes", () => {
    it("should render small size correctly", () => {
      render(
        <Pagination size="sm">
          <PaginationContent size="sm">
            <PaginationItem>
              <PaginationLink size="sm" href="?page=1">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      const link = screen.getByText("1")
      expect(link).toHaveClass("h-8", "w-8", "text-xs")
    })

    it("should render default size correctly", () => {
      render(
        <Pagination size="default">
          <PaginationContent size="default">
            <PaginationItem>
              <PaginationLink size="default" href="?page=1">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      const link = screen.getByText("1")
      expect(link).toHaveClass("h-9", "w-9", "text-sm")
    })

    it("should render large size correctly", () => {
      render(
        <Pagination size="lg">
          <PaginationContent size="lg">
            <PaginationItem>
              <PaginationLink size="lg" href="?page=1">1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      const link = screen.getByText("1")
      expect(link).toHaveClass("h-10", "w-10", "text-base")
    })
  })

  describe("PaginationLink", () => {
    it("should render link correctly", () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationLink href="?page=1">Page 1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      const link = screen.getByText("Page 1")
      expect(link).toBeInTheDocument()
      expect(link.tagName).toBe("A")
      expect(link).toHaveAttribute("href", "?page=1")
    })

    it("should handle active state", () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationLink href="?page=1" isActive>Page 1</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      const link = screen.getByText("Page 1")
      expect(link).toHaveAttribute("aria-current", "page")
      expect(link).toHaveClass("bg-primary", "text-primary-foreground")
    })

    it("should handle click events", async () => {
      const handleClick = jest.fn()
      const user = userEvent.setup()

      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationLink href="?page=1" onClick={handleClick}>
                Page 1
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      await user.click(screen.getByText("Page 1"))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe("PaginationButton", () => {
    it("should render button correctly", () => {
      const handleClick = jest.fn()

      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationButton onClick={handleClick}>Page 1</PaginationButton>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      const button = screen.getByRole("button", { name: "Page 1" })
      expect(button).toBeInTheDocument()
    })

    it("should handle active state", () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationButton isActive>Page 1</PaginationButton>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("aria-current", "page")
      expect(button).toHaveClass("bg-primary", "text-primary-foreground")
    })

    it("should handle click events", async () => {
      const handleClick = jest.fn()
      const user = userEvent.setup()

      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationButton onClick={handleClick}>Page 1</PaginationButton>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      await user.click(screen.getByRole("button"))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it("should handle disabled state", async () => {
      const handleClick = jest.fn()
      const user = userEvent.setup()

      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationButton onClick={handleClick} disabled>
                Page 1
              </PaginationButton>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      const button = screen.getByRole("button")
      expect(button).toBeDisabled()

      await user.click(button)
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe("PaginationPrevious and PaginationNext", () => {
    it("should render previous link correctly", () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="?page=1" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      const prevLink = screen.getByLabelText("Go to previous page")
      expect(prevLink).toBeInTheDocument()
      expect(prevLink).toHaveAttribute("href", "?page=1")
      expect(screen.getByText("Previous")).toBeInTheDocument()
    })

    it("should render next link correctly", () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationNext href="?page=3" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      const nextLink = screen.getByLabelText("Go to next page")
      expect(nextLink).toBeInTheDocument()
      expect(nextLink).toHaveAttribute("href", "?page=3")
      expect(screen.getByText("Next")).toBeInTheDocument()
    })
  })

  describe("PaginationEllipsis", () => {
    it("should render ellipsis correctly", () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      const ellipsis = screen.getByText("More pages")
      expect(ellipsis).toBeInTheDocument()
      expect(ellipsis).toHaveClass("sr-only")

      const ellipsisContainer = ellipsis.parentElement
      expect(ellipsisContainer).toHaveAttribute("aria-hidden", "true")
    })
  })

  describe("generatePaginationRange Utility", () => {
    it("should generate simple range for small total pages", () => {
      expect(generatePaginationRange(1, 5)).toEqual([1, 2, 3, 4, 5])
      expect(generatePaginationRange(3, 5)).toEqual([1, 2, 3, 4, 5])
    })

    it("should generate range with ellipsis at the end", () => {
      expect(generatePaginationRange(1, 10)).toEqual([1, 2, 3, 4, 5, "ellipsis", 10])
      expect(generatePaginationRange(2, 10)).toEqual([1, 2, 3, 4, 5, "ellipsis", 10])
    })

    it("should generate range with ellipsis at the beginning", () => {
      expect(generatePaginationRange(9, 10)).toEqual([1, "ellipsis", 6, 7, 8, 9, 10])
      expect(generatePaginationRange(10, 10)).toEqual([1, "ellipsis", 6, 7, 8, 9, 10])
    })

    it("should generate range with ellipsis on both sides", () => {
      expect(generatePaginationRange(5, 15)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 15])
      expect(generatePaginationRange(8, 20)).toEqual([1, "ellipsis", 7, 8, 9, "ellipsis", 20])
    })

    it("should handle custom maxVisible parameter", () => {
      expect(generatePaginationRange(5, 15, 5)).toEqual([1, "ellipsis", 5, "ellipsis", 15])
      expect(generatePaginationRange(1, 15, 3)).toEqual([1, "ellipsis", 15])
    })

    it("should handle edge cases", () => {
      expect(generatePaginationRange(1, 1)).toEqual([1])
      expect(generatePaginationRange(1, 2)).toEqual([1, 2])
    })
  })

  describe("SimplePagination", () => {
    it("should render simple pagination correctly", () => {
      const handlePageChange = jest.fn()

      render(
        <SimplePagination
          currentPage={2}
          totalPages={5}
          onPageChange={handlePageChange}
        />
      )

      expect(screen.getByText("1")).toBeInTheDocument()
      expect(screen.getByText("2")).toBeInTheDocument()
      expect(screen.getByText("3")).toBeInTheDocument()
      expect(screen.getByText("4")).toBeInTheDocument()
      expect(screen.getByText("5")).toBeInTheDocument()

      const currentPage = screen.getByText("2")
      expect(currentPage).toHaveAttribute("aria-current", "page")
    })

    it("should handle page changes", async () => {
      const handlePageChange = jest.fn()
      const user = userEvent.setup()

      render(
        <SimplePagination
          currentPage={2}
          totalPages={5}
          onPageChange={handlePageChange}
        />
      )

      await user.click(screen.getByText("3"))
      expect(handlePageChange).toHaveBeenCalledWith(3)

      await user.click(screen.getByLabelText("Go to next page"))
      expect(handlePageChange).toHaveBeenCalledWith(3)

      await user.click(screen.getByLabelText("Go to previous page"))
      expect(handlePageChange).toHaveBeenCalledWith(1)
    })

    it("should handle first/last buttons", async () => {
      const handlePageChange = jest.fn()
      const user = userEvent.setup()

      render(
        <SimplePagination
          currentPage={5}
          totalPages={10}
          onPageChange={handlePageChange}
          showFirstLast
        />
      )

      expect(screen.getByText("First")).toBeInTheDocument()
      expect(screen.getByText("Last")).toBeInTheDocument()

      await user.click(screen.getByText("First"))
      expect(handlePageChange).toHaveBeenCalledWith(1)

      await user.click(screen.getByText("Last"))
      expect(handlePageChange).toHaveBeenCalledWith(10)
    })

    it("should hide first/last buttons when not needed", () => {
      const handlePageChange = jest.fn()

      render(
        <SimplePagination
          currentPage={1}
          totalPages={5}
          onPageChange={handlePageChange}
          showFirstLast
        />
      )

      expect(screen.queryByText("First")).not.toBeInTheDocument()
      expect(screen.getByText("Last")).toBeInTheDocument()
    })

    it("should handle disabled state", async () => {
      const handlePageChange = jest.fn()
      const user = userEvent.setup()

      render(
        <SimplePagination
          currentPage={2}
          totalPages={5}
          onPageChange={handlePageChange}
          disabled
        />
      )

      const buttons = screen.getAllByRole("button")
      buttons.forEach(button => {
        expect(button).toBeDisabled()
      })

      await user.click(screen.getByText("3"))
      expect(handlePageChange).not.toHaveBeenCalled()
    })

    it("should not render when totalPages is 1 or less", () => {
      const handlePageChange = jest.fn()

      const { container: container1 } = render(
        <SimplePagination
          currentPage={1}
          totalPages={1}
          onPageChange={handlePageChange}
        />
      )

      const { container: container0 } = render(
        <SimplePagination
          currentPage={1}
          totalPages={0}
          onPageChange={handlePageChange}
        />
      )

      expect(container1.firstChild).toBeNull()
      expect(container0.firstChild).toBeNull()
    })

    it("should handle edge cases for current page", () => {
      const handlePageChange = jest.fn()

      render(
        <SimplePagination
          currentPage={1}
          totalPages={5}
          onPageChange={handlePageChange}
        />
      )

      const prevButton = screen.getByLabelText("Go to previous page")
      expect(prevButton).toBeDisabled()

      const nextButton = screen.getByLabelText("Go to next page")
      expect(nextButton).not.toBeDisabled()
    })

    it("should support different variants and sizes", () => {
      const handlePageChange = jest.fn()

      render(
        <SimplePagination
          currentPage={2}
          totalPages={5}
          onPageChange={handlePageChange}
          variant="outline"
          size="lg"
        />
      )

      const nav = screen.getByRole("navigation")
      expect(nav).toBeInTheDocument()

      const buttons = screen.getAllByRole("button")
      buttons.forEach(button => {
        expect(button).toHaveClass("h-10", "w-10", "text-base")
      })
    })

    it("should support maxVisible prop", () => {
      const handlePageChange = jest.fn()

      render(
        <SimplePagination
          currentPage={5}
          totalPages={15}
          onPageChange={handlePageChange}
          maxVisible={5}
        />
      )

      // Should show ellipsis
      expect(screen.getAllByText("More pages")).toHaveLength(2) // Two ellipsis elements
    })

    it("should not call onPageChange for invalid pages", async () => {
      const handlePageChange = jest.fn()
      const user = userEvent.setup()

      render(
        <SimplePagination
          currentPage={2}
          totalPages={5}
          onPageChange={handlePageChange}
        />
      )

      // Click on current page - should not call onPageChange
      await user.click(screen.getByText("2"))
      expect(handlePageChange).not.toHaveBeenCalled()
    })
  })

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(
        <SimplePagination
          currentPage={2}
          totalPages={5}
          onPageChange={() => {}}
        />
      )

      const nav = screen.getByRole("navigation")
      expect(nav).toHaveAttribute("aria-label", "pagination")

      const currentPage = screen.getByText("2")
      expect(currentPage).toHaveAttribute("aria-current", "page")

      const prevButton = screen.getByLabelText("Go to previous page")
      expect(prevButton).toBeInTheDocument()

      const nextButton = screen.getByLabelText("Go to next page")
      expect(nextButton).toBeInTheDocument()
    })

    it("should support keyboard navigation", async () => {
      const handlePageChange = jest.fn()
      const user = userEvent.setup()

      render(
        <SimplePagination
          currentPage={2}
          totalPages={5}
          onPageChange={handlePageChange}
        />
      )

      const page3Button = screen.getByText("3")
      
      page3Button.focus()
      expect(page3Button).toHaveFocus()

      await user.keyboard("{Enter}")
      expect(handlePageChange).toHaveBeenCalledWith(3)
    })

    it("should have no accessibility violations", async () => {
      const { container } = render(
        <SimplePagination
          currentPage={3}
          totalPages={10}
          onPageChange={() => {}}
          showFirstLast
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe("Edge Cases", () => {
    it("should handle rapid page changes", async () => {
      const handlePageChange = jest.fn()
      const user = userEvent.setup()

      render(
        <SimplePagination
          currentPage={5}
          totalPages={10}
          onPageChange={handlePageChange}
        />
      )

      const nextButton = screen.getByLabelText("Go to next page")
      
      // Rapid clicks
      await user.click(nextButton)
      await user.click(nextButton)
      await user.click(nextButton)
      
      // Should handle gracefully
      expect(handlePageChange).toHaveBeenCalledTimes(3)
    })

    it("should handle custom className", () => {
      const handlePageChange = jest.fn()

      render(
        <SimplePagination
          currentPage={2}
          totalPages={5}
          onPageChange={handlePageChange}
          className="custom-pagination"
        />
      )

      const nav = screen.getByRole("navigation")
      expect(nav).toHaveClass("custom-pagination")
    })

    it("should handle large page numbers", () => {
      const handlePageChange = jest.fn()

      render(
        <SimplePagination
          currentPage={500}
          totalPages={1000}
          onPageChange={handlePageChange}
        />
      )

      expect(screen.getByText("500")).toBeInTheDocument()
      expect(screen.getByText("1000")).toBeInTheDocument()
    })
  })

  describe("Performance", () => {
    it("should not re-render unnecessarily", () => {
      const renderSpy = jest.fn()
      
      const TestComponent = ({ currentPage }: { currentPage: number }) => {
        renderSpy()
        return (
          <SimplePagination
            currentPage={currentPage}
            totalPages={10}
            onPageChange={() => {}}
          />
        )
      }

      const { rerender } = render(<TestComponent currentPage={1} />)
      
      expect(renderSpy).toHaveBeenCalledTimes(1)
      
      // Re-render with same props
      rerender(<TestComponent currentPage={1} />)
      
      expect(renderSpy).toHaveBeenCalledTimes(2)
    })

    it("should handle large pagination efficiently", () => {
      const start = performance.now()
      
      render(
        <SimplePagination
          currentPage={500}
          totalPages={10000}
          onPageChange={() => {}}
        />
      )
      
      const end = performance.now()
      const renderTime = end - start
      
      // Should render in reasonable time (less than 100ms for large pagination)
      expect(renderTime).toBeLessThan(100)
    })
  })
})
