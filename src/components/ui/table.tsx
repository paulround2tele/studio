import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const tableVariants = cva(
  "w-full caption-bottom text-sm",
  {
    variants: {
      variant: {
        default: "border-collapse",
        striped: "border-collapse [&_tbody_tr:nth-child(even)]:bg-muted/30",
        bordered: "border-collapse border border-border",
        minimal: "border-collapse"
      },
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

const tableHeaderVariants = cva(
  "[&_tr]:border-b",
  {
    variants: {
      variant: {
        default: "",
        elevated: "bg-muted/50",
        accent: "bg-accent",
        minimal: "border-none"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

const tableRowVariants = cva(
  "border-b transition-colors",
  {
    variants: {
      variant: {
        default: "hover:bg-muted/50 data-[state=selected]:bg-muted",
        interactive: "hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer",
        static: "",
        accent: "hover:bg-accent/50 data-[state=selected]:bg-accent"
      },
      size: {
        sm: "h-8",
        default: "h-12",
        lg: "h-16"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

const tableCellVariants = cva(
  "align-middle [&:has([role=checkbox])]:pr-0",
  {
    variants: {
      size: {
        sm: "p-2",
        default: "p-4",
        lg: "p-6"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

const tableHeadVariants = cva(
  "text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
  {
    variants: {
      size: {
        sm: "h-8 px-2 py-1",
        default: "h-12 px-4",
        lg: "h-16 px-6"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

export interface TableProps
  extends React.HTMLAttributes<HTMLTableElement>,
    VariantProps<typeof tableVariants> {
  containerClassName?: string
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant, size, containerClassName, ...props }, ref) => (
    <div className={cn("relative w-full overflow-auto", containerClassName)}>
      <table
        ref={ref}
        className={cn(tableVariants({ variant, size }), className)}
        {...props}
      />
    </div>
  )
)
Table.displayName = "Table"

export interface TableHeaderProps
  extends React.HTMLAttributes<HTMLTableSectionElement>,
    VariantProps<typeof tableHeaderVariants> {}

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, variant, ...props }, ref) => (
    <thead ref={ref} className={cn(tableHeaderVariants({ variant }), className)} {...props} />
  )
)
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

export interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement>,
    VariantProps<typeof tableRowVariants> {}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, variant, size, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(tableRowVariants({ variant, size }), className)}
      {...props}
    />
  )
)
TableRow.displayName = "TableRow"

export interface TableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement>,
    VariantProps<typeof tableHeadVariants> {}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, size, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(tableHeadVariants({ size }), className)}
      {...props}
    />
  )
)
TableHead.displayName = "TableHead"

export interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement>,
    VariantProps<typeof tableCellVariants> {}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, size, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(tableCellVariants({ size }), className)}
      {...props}
    />
  )
)
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
