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
        minimal: "border-collapse",
        card: "border-collapse border border-border rounded-lg overflow-hidden",
        compact: "border-collapse text-xs"
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
        minimal: "border-none",
        dark: "bg-slate-900 text-slate-50",
        gradient: "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
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
        accent: "hover:bg-accent/50 data-[state=selected]:bg-accent",
        subtle: "hover:bg-muted/30 data-[state=selected]:bg-muted/60"
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
      },
      textAlign: {
        left: "text-left",
        center: "text-center",
        right: "text-right"
      }
    },
    defaultVariants: {
      size: "default",
      textAlign: "left"
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
      },
      sortable: {
        true: "cursor-pointer hover:text-foreground transition-colors select-none",
        false: ""
      }
    },
    defaultVariants: {
      size: "default",
      sortable: false
    }
  }
)

// Simple Table Wrapper for common use cases
interface SimpleTableProps extends TableProps {
  headers: string[]
  data: Record<string, unknown>[]
  caption?: string
  onRowClick?: (row: Record<string, unknown>, index: number) => void
  sortable?: boolean
  loading?: boolean
  emptyMessage?: string
}

const SimpleTable = React.forwardRef<HTMLTableElement, SimpleTableProps>(
  ({ 
    headers, 
    data, 
    caption, 
    onRowClick, 
    sortable = false,
    loading = false,
    emptyMessage = "No data available",
    variant = "default",
    size = "default",
    ...props 
  }, ref) => {
    const [sortColumn, setSortColumn] = React.useState<string | null>(null)
    const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')

    const handleSort = React.useCallback((column: string) => {
      if (!sortable) return
      
      if (sortColumn === column) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
      } else {
        setSortColumn(column)
        setSortDirection('asc')
      }
    }, [sortColumn, sortDirection, sortable])

    const sortedData = React.useMemo(() => {
      if (!sortColumn || !sortable) return data
      
      return [...data].sort((a, b) => {
        const aValue = a[sortColumn] as string | number
        const bValue = b[sortColumn] as string | number
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }, [data, sortColumn, sortDirection, sortable])

    return (
      <Table ref={ref} variant={variant} size={size} {...props}>
        {caption && <TableCaption>{caption}</TableCaption>}
        <TableHeader>
          <TableRow>
            {headers.map((header, index) => (
              <TableHead 
                key={index}
                sortable={sortable}
                onClick={() => handleSort(header)}
                className={sortable ? "cursor-pointer" : ""}
                size={size}
              >
                <div className="flex items-center gap-2">
                  {header}
                  {sortable && sortColumn === header && (
                    <span className="text-xs">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={headers.length} className="text-center p-8">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-border border-t-foreground rounded-full" />
                  Loading...
                </div>
              </TableCell>
            </TableRow>
          ) : sortedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={headers.length} className="text-center p-8 text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            sortedData.map((row, index) => (
              <TableRow 
                key={index}
                variant={onRowClick ? "interactive" : "default"}
                onClick={() => onRowClick?.(row, index)}
                size={size}
              >
                {headers.map((header, cellIndex) => (
                  <TableCell key={cellIndex} size={size}>
                    {(row[header] as React.ReactNode) ?? '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    )
  }
)
SimpleTable.displayName = "SimpleTable"

// Table Loading Component
const TableLoading = React.forwardRef<HTMLTableElement, { headers: string[]; rows?: number } & TableProps>(
  ({ headers, rows = 5, ...props }, ref) => (
    <Table ref={ref} {...props}>
      <TableHeader>
        <TableRow>
          {headers.map((header, index) => (
            <TableHead key={index}>{header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }, (_, rowIndex) => (
          <TableRow key={rowIndex}>
            {headers.map((_, cellIndex) => (
              <TableCell key={cellIndex}>
                <div className="h-4 bg-muted animate-pulse rounded" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
)
TableLoading.displayName = "TableLoading"

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
  ({ className, size, sortable, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(tableHeadVariants({ size, sortable }), className)}
      {...props}
    />
  )
)
TableHead.displayName = "TableHead"

export interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement>,
    VariantProps<typeof tableCellVariants> {}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, size, textAlign, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(tableCellVariants({ size, textAlign }), className)}
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
  SimpleTable,
  TableLoading,
}
