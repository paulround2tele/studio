"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const paginationVariants = cva(
  "mx-auto flex w-full justify-center",
  {
    variants: {
      variant: {
        default: "",
        outline: "",
        ghost: "",
        minimal: "",
      },
      size: {
        sm: "",
        default: "",
        lg: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const paginationContentVariants = cva(
  "flex flex-row items-center gap-1",
  {
    variants: {
      variant: {
        default: "",
        outline: "",
        ghost: "",
        minimal: "",
      },
      size: {
        sm: "gap-0.5",
        default: "gap-1",
        lg: "gap-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const paginationItemVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "hover:bg-accent hover:text-accent-foreground",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        minimal: "hover:bg-accent/50 hover:text-accent-foreground",
      },
      size: {
        sm: "h-8 w-8 text-xs",
        default: "h-9 w-9 text-sm",
        lg: "h-10 w-10 text-base",
      },
      active: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "default",
        active: true,
        className: "bg-primary text-primary-foreground hover:bg-primary/90",
      },
      {
        variant: "outline",
        active: true,
        className: "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
      },
      {
        variant: "ghost",
        active: true,
        className: "bg-accent text-accent-foreground",
      },
      {
        variant: "minimal",
        active: true,
        className: "bg-accent/70 text-accent-foreground",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      active: false,
    },
  }
)

export interface PaginationProps
  extends React.ComponentPropsWithoutRef<"nav">,
    VariantProps<typeof paginationVariants> {}

const Pagination = React.forwardRef<
  React.ElementRef<"nav">,
  PaginationProps
>(({ className, variant, size, ...props }, ref) => (
  <nav
    ref={ref}
    role="navigation"
    aria-label="pagination"
    className={cn(paginationVariants({ variant, size }), className)}
    {...props}
  />
))
Pagination.displayName = "Pagination"

export interface PaginationContentProps
  extends React.ComponentPropsWithoutRef<"ul">,
    VariantProps<typeof paginationContentVariants> {}

const PaginationContent = React.forwardRef<
  React.ElementRef<"ul">,
  PaginationContentProps
>(({ className, variant, size, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn(paginationContentVariants({ variant, size }), className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<
  React.ElementRef<"li">,
  React.ComponentPropsWithoutRef<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

export interface PaginationLinkProps
  extends React.ComponentPropsWithoutRef<"a">,
    VariantProps<typeof paginationItemVariants> {
  isActive?: boolean
}

const PaginationLink = React.forwardRef<
  React.ElementRef<"a">,
  PaginationLinkProps
>(({ className, variant, size, isActive, ...props }, ref) => (
  <a
    ref={ref}
    aria-current={isActive ? "page" : undefined}
    className={cn(
      paginationItemVariants({ variant, size, active: isActive }),
      className
    )}
    {...props}
  />
))
PaginationLink.displayName = "PaginationLink"

export interface PaginationButtonProps
  extends React.ComponentPropsWithoutRef<"button">,
    VariantProps<typeof paginationItemVariants> {
  isActive?: boolean
}

const PaginationButton = React.forwardRef<
  React.ElementRef<"button">,
  PaginationButtonProps
>(({ className, variant, size, isActive, ...props }, ref) => (
  <button
    ref={ref}
    aria-current={isActive ? "page" : undefined}
    className={cn(
      paginationItemVariants({ variant, size, active: isActive }),
      className
    )}
    {...props}
  />
))
PaginationButton.displayName = "PaginationButton"

const PaginationPrevious = React.forwardRef<
  React.ElementRef<typeof PaginationLink>,
  React.ComponentPropsWithoutRef<typeof PaginationLink>
>(({ className, ...props }, ref) => (
  <PaginationLink
    ref={ref}
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
))
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = React.forwardRef<
  React.ElementRef<typeof PaginationLink>,
  React.ComponentPropsWithoutRef<typeof PaginationLink>
>(({ className, ...props }, ref) => (
  <PaginationLink
    ref={ref}
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
))
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = React.forwardRef<
  React.ElementRef<"span">,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
))
PaginationEllipsis.displayName = "PaginationEllipsis"

// Utility functions
export function generatePaginationRange(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 7
): (number | "ellipsis")[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const leftOffset = Math.floor((maxVisible - 3) / 2)
  const rightOffset = leftOffset

  if (currentPage <= leftOffset + 2) {
    return [
      ...Array.from({ length: maxVisible - 2 }, (_, i) => i + 1),
      "ellipsis",
      totalPages,
    ]
  }

  if (currentPage >= totalPages - rightOffset - 1) {
    return [
      1,
      "ellipsis",
      ...Array.from({ length: maxVisible - 2 }, (_, i) => totalPages - (maxVisible - 3) + i),
    ]
  }

  return [
    1,
    "ellipsis",
    ...Array.from({ length: maxVisible - 4 }, (_, i) => currentPage - leftOffset + i + 1),
    "ellipsis",
    totalPages,
  ]
}

// Compound component for simple usage
interface SimplePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  variant?: VariantProps<typeof paginationVariants>["variant"]
  size?: VariantProps<typeof paginationVariants>["size"]
  showPreviousNext?: boolean
  showFirstLast?: boolean
  maxVisible?: number
  disabled?: boolean
  className?: string
}

const SimplePagination = React.forwardRef<
  React.ElementRef<"nav">,
  SimplePaginationProps
>(({
  currentPage,
  totalPages,
  onPageChange,
  variant = "default",
  size = "default",
  showPreviousNext = true,
  showFirstLast = false,
  maxVisible = 7,
  disabled = false,
  className,
  ...props
}, ref) => {
  const pages = generatePaginationRange(currentPage, totalPages, maxVisible)

  const handlePageChange = (page: number) => {
    if (!disabled && page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page)
    }
  }

  if (totalPages <= 1) {
    return null
  }

  return (
    <Pagination ref={ref} variant={variant} size={size} className={className} {...props}>
      <PaginationContent variant={variant} size={size}>
        {showFirstLast && currentPage > 1 && (
          <PaginationItem>
            <PaginationButton
              variant={variant}
              size={size}
              onClick={() => handlePageChange(1)}
              disabled={disabled}
              aria-label="Go to first page"
            >
              First
            </PaginationButton>
          </PaginationItem>
        )}

        {showPreviousNext && (
          <PaginationItem>
            <PaginationButton
              variant={variant}
              size={size}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={disabled || currentPage <= 1}
              aria-label="Go to previous page"
              className="gap-1 pl-2.5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </PaginationButton>
          </PaginationItem>
        )}

        {pages.map((page, index) => (
          <PaginationItem key={index}>
            {page === "ellipsis" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationButton
                variant={variant}
                size={size}
                isActive={page === currentPage}
                onClick={() => handlePageChange(page)}
                disabled={disabled}
                aria-label={`Go to page ${page}`}
              >
                {page}
              </PaginationButton>
            )}
          </PaginationItem>
        ))}

        {showPreviousNext && (
          <PaginationItem>
            <PaginationButton
              variant={variant}
              size={size}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={disabled || currentPage >= totalPages}
              aria-label="Go to next page"
              className="gap-1 pr-2.5"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </PaginationButton>
          </PaginationItem>
        )}

        {showFirstLast && currentPage < totalPages && (
          <PaginationItem>
            <PaginationButton
              variant={variant}
              size={size}
              onClick={() => handlePageChange(totalPages)}
              disabled={disabled}
              aria-label="Go to last page"
            >
              Last
            </PaginationButton>
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  )
})
SimplePagination.displayName = "SimplePagination"

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationButton,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
  SimplePagination,
  paginationVariants,
  paginationContentVariants,
  paginationItemVariants,
}
