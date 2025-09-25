"use client"

import * as React from "react"
import { ChevronRight, MoreHorizontal } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const breadcrumbVariants = cva(
  "flex items-center space-x-1 text-sm",
  {
    variants: {
      variant: {
        default: "text-muted-foreground",
        subtle: "text-muted-foreground/70",
        prominent: "text-foreground font-medium",
        minimal: "text-muted-foreground/60",
      },
      size: {
        sm: "text-xs space-x-0.5",
        default: "text-sm space-x-1",
        lg: "text-base space-x-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const breadcrumbItemVariants = cva(
  "inline-flex items-center transition-colors hover:text-foreground",
  {
    variants: {
      variant: {
        default: "text-muted-foreground hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        button: "cursor-pointer rounded px-1 py-0.5 hover:bg-accent hover:text-accent-foreground",
        current: "text-foreground font-medium cursor-default",
      },
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const breadcrumbSeparatorVariants = cva(
  "flex items-center justify-center",
  {
    variants: {
      variant: {
        default: "text-muted-foreground/50",
        subtle: "text-muted-foreground/30",
        prominent: "text-muted-foreground/70",
      },
      size: {
        sm: "h-3 w-3",
        default: "h-4 w-4",
        lg: "h-5 w-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BreadcrumbProps
  extends React.ComponentPropsWithoutRef<"nav">,
    VariantProps<typeof breadcrumbVariants> {
  separator?: React.ReactNode
}

const Breadcrumb = React.forwardRef<
  React.ElementRef<"nav">,
  BreadcrumbProps
>(({ className, variant, size, ...props }, ref) => (
  <nav
    ref={ref}
    aria-label="Breadcrumb"
    className={cn(breadcrumbVariants({ variant, size }), className)}
    {...props}
  />
))
Breadcrumb.displayName = "Breadcrumb"

const BreadcrumbList = React.forwardRef<
  React.ElementRef<"ol">,
  React.ComponentPropsWithoutRef<"ol">
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
      className
    )}
    {...props}
  />
))
BreadcrumbList.displayName = "BreadcrumbList"

export interface BreadcrumbItemProps
  extends React.ComponentPropsWithoutRef<"li">,
    VariantProps<typeof breadcrumbItemVariants> {
  asChild?: boolean
}

const BreadcrumbItem = React.forwardRef<
  React.ElementRef<"li">,
  BreadcrumbItemProps
>(({ className, variant, size, ...props }, ref) => (
  <li
    ref={ref}
    className={cn(breadcrumbItemVariants({ variant, size }), className)}
    {...props}
  />
))
BreadcrumbItem.displayName = "BreadcrumbItem"

const BreadcrumbLink = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & {
    asChild?: boolean
  }
>(({ className, asChild, children, ...props }, ref) => {
  if (asChild) {
    return <>{children}</>
  }
  
  return (
    <a
      ref={ref}
      className={cn(
        "transition-colors hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </a>
  )
})
BreadcrumbLink.displayName = "BreadcrumbLink"

const BreadcrumbPage = React.forwardRef<
  React.ElementRef<"span">,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn("font-normal text-foreground", className)}
    {...props}
  />
))
BreadcrumbPage.displayName = "BreadcrumbPage"

export interface BreadcrumbSeparatorProps
  extends React.ComponentPropsWithoutRef<"li">,
    VariantProps<typeof breadcrumbSeparatorVariants> {
  children?: React.ReactNode
}

const BreadcrumbSeparator = React.forwardRef<
  React.ElementRef<"li">,
  BreadcrumbSeparatorProps
>(({ children, className, variant, size, ...props }, ref) => (
  <li
    ref={ref}
    role="presentation"
    aria-hidden="true"
    className={cn(breadcrumbSeparatorVariants({ variant, size }), className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
))
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

const BreadcrumbEllipsis = React.forwardRef<
  React.ElementRef<"li">,
  React.ComponentPropsWithoutRef<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    role="presentation"
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </li>
))
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis"

// Compound component for simple usage
interface BreadcrumbItemData {
  label: string
  href?: string
  onClick?: () => void
  current?: boolean
}

interface BreadcrumbEllipsisData {
  label: string
  ellipsis: true
}

type BreadcrumbItemType = BreadcrumbItemData | BreadcrumbEllipsisData

interface SimpleBreadcrumbProps {
  items: BreadcrumbItemData[]
  variant?: VariantProps<typeof breadcrumbVariants>["variant"]
  size?: VariantProps<typeof breadcrumbVariants>["size"]
  separator?: React.ReactNode
  maxItems?: number
  className?: string
  onItemClick?: (item: BreadcrumbItemData, index: number) => void
}

const SimpleBreadcrumb = React.forwardRef<
  React.ElementRef<"nav">,
  SimpleBreadcrumbProps
>(({
  items,
  variant = "default",
  size = "default",
  separator,
  maxItems,
  className,
  onItemClick,
  ...props
}, ref) => {
  const visibleItems = React.useMemo(() => {
    if (!maxItems || items.length <= maxItems) {
      return items as BreadcrumbItemType[]
    }
    
    if (maxItems <= 2) {
      return [items[0], items[items.length - 1]] as BreadcrumbItemType[]
    }
    
    const firstItems = items.slice(0, 1)
    const lastItems = items.slice(-(maxItems - 2))
    
    return [...firstItems, { label: "...", ellipsis: true as const }, ...lastItems] as BreadcrumbItemType[]
  }, [items, maxItems])

  return (
    <Breadcrumb ref={ref} variant={variant} size={size} className={className} {...props}>
      <BreadcrumbList>
        {visibleItems.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <BreadcrumbSeparator 
                variant={variant === "minimal" ? "default" : variant} 
                size={size}
              >
                {separator}
              </BreadcrumbSeparator>
            )}
            <BreadcrumbItem
              variant={
                "ellipsis" in item 
                  ? "default" 
                  : item.current 
                    ? "current" 
                    : item.href || item.onClick 
                      ? "link" 
                      : "default"
              }
              size={size}
            >
              {"ellipsis" in item ? (
                <span role="presentation" aria-hidden="true" className="flex h-9 w-9 items-center justify-center">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More pages</span>
                </span>
              ) : item.current ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : item.href ? (
                <BreadcrumbLink
                  href={item.href}
                  onClick={() => onItemClick?.(item, index)}
                >
                  {item.label}
                </BreadcrumbLink>
              ) : item.onClick ? (
                <button
                  onClick={() => {
                    item.onClick?.()
                    onItemClick?.(item, index)
                  }}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </button>
              ) : (
                <span>{item.label}</span>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
})
SimpleBreadcrumb.displayName = "SimpleBreadcrumb"

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
  SimpleBreadcrumb,
  breadcrumbVariants,
  breadcrumbItemVariants,
  breadcrumbSeparatorVariants,
}
