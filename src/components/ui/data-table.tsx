import * as React from "react"
import { ChevronDown, ChevronUp, ChevronsUpDown, Search, Filter, MoreHorizontal, Check, X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import Button from "@/components/ta/ui/button/Button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import Badge from "@/components/ta/ui/badge/Badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Column definition types
export interface DataTableColumn<T extends Record<string, unknown>, V = unknown> {
  /** Unique column identifier */
  id: string
  /** Header label or custom node */
  header: string | React.ReactNode
  /** Key on the row used for value extraction (mutually exclusive with accessorFn) */
  accessorKey?: keyof T
  /** Custom accessor function producing a value of type V */
  accessorFn?: (row: T) => V
  /** Custom cell renderer receiving strongly typed row & value */
  cell?: (info: { row: T; value: V; column: DataTableColumn<T, V> }) => React.ReactNode
  /** Enable sorting interactions */
  enableSorting?: boolean
  /** Enable column-level filtering */
  enableFiltering?: boolean
  /** Filter predicate for this column */
  filterFn?: (row: T, columnId: string, filterValue: unknown) => boolean
  /** Custom sorting comparator (return negative/zero/positive) */
  sortingFn?: (rowA: T, rowB: T, columnId: string) => number
  /** Preferred pixel width */
  size?: number
  minSize?: number
  maxSize?: number
  /** Arbitrary metadata constrained to unknown for later narrowing */
  meta?: Record<string, unknown>
}

export interface DataTableState {
  sorting: Array<{ id: string; desc: boolean }>
  filtering: Array<{ id: string; value: unknown }>
  globalFilter: string
  pagination: { pageIndex: number; pageSize: number }
  rowSelection: Record<string, boolean>
  columnVisibility: Record<string, boolean>
}

export interface DataTableProps<T extends Record<string, unknown>> extends VariantProps<typeof dataTableVariants> {
  data: T[]
  columns: DataTableColumn<T, any>[]
  state?: Partial<DataTableState>
  onStateChange?: (state: Partial<DataTableState>) => void
  enableSorting?: boolean
  enableFiltering?: boolean
  enableGlobalFilter?: boolean
  enablePagination?: boolean
  enableRowSelection?: boolean
  enableColumnVisibility?: boolean
  isLoading?: boolean
  loadingRows?: number
  emptyState?: React.ReactNode
  className?: string
  tableProps?: React.ComponentProps<typeof Table>
  manualPagination?: boolean
  pageCount?: number
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void
  onGlobalFilterChange?: (globalFilter: string) => void
  onRowSelectionChange?: (rowSelection: Record<string, boolean>) => void
}

const dataTableVariants = cva(
  "w-full",
  {
    variants: {
      variant: {
        default: "",
        compact: "text-xs",
        comfortable: "text-sm"
      },
      density: {
        compact: "[&_.data-table-row]:h-8 [&_.data-table-cell]:py-1 [&_.data-table-head]:py-1",
        default: "[&_.data-table-row]:h-12 [&_.data-table-cell]:py-2 [&_.data-table-head]:py-2",
        comfortable: "[&_.data-table-row]:h-16 [&_.data-table-cell]:py-3 [&_.data-table-head]:py-3"
      }
    },
    defaultVariants: {
      variant: "default",
      density: "default"
    }
  }
)

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  state: controlledState,
  onStateChange,
  enableSorting = true,
  enableFiltering = false,
  enableGlobalFilter = true,
  enablePagination = true,
  enableRowSelection = false,
  enableColumnVisibility = false,
  isLoading = false,
  loadingRows = 5,
  emptyState,
  className,
  tableProps,
  variant,
  density,
  manualPagination = false,
  pageCount,
  onPaginationChange,
  onSortingChange,
  onGlobalFilterChange,
  onRowSelectionChange,
  ...props
}: DataTableProps<T>) {
  // Internal state management
  const [internalState, setInternalState] = React.useState<DataTableState>({
    sorting: [],
    filtering: [],
    globalFilter: "",
    pagination: { pageIndex: 0, pageSize: 10 },
    rowSelection: {},
    columnVisibility: {}
  })

  // Use controlled state if provided, otherwise use internal state
  const state = controlledState ? { ...internalState, ...controlledState } : internalState
  
  const updateState = React.useCallback((updates: Partial<DataTableState>) => {
    if (onStateChange) {
      onStateChange(updates)
    } else {
      setInternalState(prev => ({ ...prev, ...updates }))
    }
  }, [onStateChange])

  // Filter data based on global filter and column filters
  const filteredData = React.useMemo(() => {
    let filtered = [...data]

    // Apply global filter
    if (enableGlobalFilter && state.globalFilter) {
      const globalFilterValue = state.globalFilter.toLowerCase()
      filtered = filtered.filter(row => {
        return columns.some(column => {
          const cellValue = column.accessorFn 
            ? column.accessorFn(row)
            : column.accessorKey 
              ? row[column.accessorKey]
              : null
          
          return cellValue !== null && cellValue !== undefined && 
                 String(cellValue).toLowerCase().includes(globalFilterValue)
        })
      })
    }

    // Apply column filters
    if (enableFiltering && state.filtering.length > 0) {
      state.filtering.forEach(filter => {
        const column = columns.find(col => col.id === filter.id)
        if (column && filter.value !== undefined && filter.value !== "") {
          filtered = filtered.filter(row => {
            if (column.filterFn) {
              return column.filterFn(row, filter.id, filter.value)
            }
            
            const cellValue = column.accessorFn 
              ? column.accessorFn(row)
              : column.accessorKey 
                ? row[column.accessorKey]
                : null
            
            return cellValue !== null && cellValue !== undefined && 
                   String(cellValue).toLowerCase().includes(String(filter.value).toLowerCase())
          })
        }
      })
    }

    return filtered
  }, [data, columns, state.globalFilter, state.filtering, enableGlobalFilter, enableFiltering])

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!enableSorting || state.sorting.length === 0) return filteredData

    const sorted = [...filteredData]
    state.sorting.forEach(sort => {
      const column = columns.find(col => col.id === sort.id)
      if (column && column.enableSorting !== false) {
        sorted.sort((a, b) => {
          if (column.sortingFn) {
            const result = column.sortingFn(a, b, sort.id)
            return sort.desc ? -result : result
          }

          const aValue = column.accessorFn 
            ? column.accessorFn(a)
            : column.accessorKey 
              ? a[column.accessorKey]
              : null
          
          const bValue = column.accessorFn 
            ? column.accessorFn(b)
            : column.accessorKey 
              ? b[column.accessorKey]
              : null

          if (aValue === null || aValue === undefined) return sort.desc ? 1 : -1
          if (bValue === null || bValue === undefined) return sort.desc ? -1 : 1
          
          if (aValue < bValue) return sort.desc ? 1 : -1
          if (aValue > bValue) return sort.desc ? -1 : 1
          return 0
        })
      }
    })

    return sorted
  }, [filteredData, state.sorting, columns, enableSorting])

  // Paginate data
  const paginatedData = React.useMemo(() => {
    if (!enablePagination || manualPagination) return sortedData
    
    const start = state.pagination.pageIndex * state.pagination.pageSize
    const end = start + state.pagination.pageSize
    return sortedData.slice(start, end)
  }, [sortedData, state.pagination, enablePagination, manualPagination])

  // Calculate pagination info
  const totalRows = manualPagination ? (pageCount || 1) * state.pagination.pageSize : sortedData.length
  const totalPages = manualPagination ? pageCount || 1 : Math.ceil(sortedData.length / state.pagination.pageSize)
  const canPreviousPage = state.pagination.pageIndex > 0
  const canNextPage = state.pagination.pageIndex < totalPages - 1

  // Handlers
  const handleSorting = (columnId: string) => {
    if (!enableSorting) return

    const newSorting = [...state.sorting]
    const existingSort = newSorting.find(sort => sort.id === columnId)
    
    if (existingSort) {
      if (existingSort.desc) {
        // Remove sorting
        const index = newSorting.indexOf(existingSort)
        newSorting.splice(index, 1)
      } else {
        // Change to descending
        existingSort.desc = true
      }
    } else {
      // Add ascending sort
      newSorting.push({ id: columnId, desc: false })
    }

    updateState({ sorting: newSorting })
    onSortingChange?.(newSorting)
  }

  const handleGlobalFilter = (value: string) => {
    updateState({ globalFilter: value, pagination: { ...state.pagination, pageIndex: 0 } })
    onGlobalFilterChange?.(value)
  }

  const handlePageChange = (pageIndex: number) => {
    const newPagination = { ...state.pagination, pageIndex }
    updateState({ pagination: newPagination })
    onPaginationChange?.(newPagination)
  }

  const handlePageSizeChange = (pageSize: number) => {
    const newPagination = { pageIndex: 0, pageSize }
    updateState({ pagination: newPagination })
    onPaginationChange?.(newPagination)
  }

  const handleRowSelection = (rowIndex: string, selected: boolean) => {
    const newSelection = { ...state.rowSelection }
    if (selected) {
      newSelection[rowIndex] = true
    } else {
      delete newSelection[rowIndex]
    }
    updateState({ rowSelection: newSelection })
    onRowSelectionChange?.(newSelection)
  }

  const handleSelectAllRows = (selected: boolean) => {
    const newSelection: Record<string, boolean> = {}
    if (selected) {
      paginatedData.forEach((_, index) => {
        newSelection[String(state.pagination.pageIndex * state.pagination.pageSize + index)] = true
      })
    }
    updateState({ rowSelection: newSelection })
    onRowSelectionChange?.(newSelection)
  }

  // Get visible columns
  const visibleColumns = React.useMemo(() => {
    if (!enableColumnVisibility) return columns
    return columns.filter(column => state.columnVisibility[column.id] !== false)
  }, [columns, state.columnVisibility, enableColumnVisibility])

  // Add selection column if row selection is enabled
  const displayColumns = React.useMemo(() => {
    const cols = [...visibleColumns]
    if (enableRowSelection) {
      cols.unshift({
        id: 'select',
        header: (
          <Checkbox
            checked={paginatedData.length > 0 && paginatedData.every((_, index) => 
              state.rowSelection[String(state.pagination.pageIndex * state.pagination.pageSize + index)]
            )}
            onCheckedChange={handleSelectAllRows}
            aria-label="Select all rows"
          />
        ),
        cell: ({ row }: { row: T }) => {
          const rowIndex = String(paginatedData.indexOf(row) + state.pagination.pageIndex * state.pagination.pageSize)
          return (
            <Checkbox
              checked={!!state.rowSelection[rowIndex]}
              onCheckedChange={(checked) => handleRowSelection(rowIndex, !!checked)}
              aria-label={`Select row ${rowIndex}`}
            />
          )
        },
        enableSorting: false,
        enableFiltering: false,
        size: 40
      })
    }
    
    // Ensure we have at least one column for proper table structure
    if (cols.length === 0) {
      cols.push({
        id: 'placeholder',
        header: '',
        accessorKey: 'placeholder' as keyof T,
        enableSorting: false,
        enableFiltering: false
      })
    }
    
    return cols
  }, [visibleColumns, enableRowSelection, paginatedData, state.rowSelection, state.pagination])

  // Render loading state
  if (isLoading) {
    return (
      <div className={cn(dataTableVariants({ variant, density }), className)} {...props}>
        {enableGlobalFilter && (
          <div className="flex items-center py-4">
            <Search className="mr-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              disabled
              className="max-w-sm"
            />
          </div>
        )}
        <div className="rounded-md border">
          <Table {...tableProps}>
            <TableHeader>
              <TableRow>
                {displayColumns.map((column) => (
                  <TableHead key={column.id} className="data-table-head">
                    {typeof column.header === 'string' ? column.header : column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: loadingRows }).map((_, index) => (
                <TableRow key={index} className="data-table-row">
                  {displayColumns.map((column) => (
                    <TableCell key={column.id} className="data-table-cell">
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  const dataToRender = manualPagination ? data : paginatedData

  return (
    <div className={cn(dataTableVariants({ variant, density }), className)} data-testid="data-table-root" {...props}>
      {/* Global Filter */}
      {enableGlobalFilter && (
        <div className="flex items-center py-4">
          <Search className="mr-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={state.globalFilter}
            onChange={(e) => handleGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table {...tableProps}>
          <TableHeader>
            <TableRow>
              {displayColumns.map((column) => (
                <TableHead 
                  key={column.id} 
                  className={cn(
                    "data-table-head",
                    enableSorting && column.enableSorting !== false && "cursor-pointer select-none"
                  )}
                  style={{
                    width: column.size ? `${column.size}px` : undefined,
                    minWidth: column.minSize ? `${column.minSize}px` : undefined,
                    maxWidth: column.maxSize ? `${column.maxSize}px` : undefined
                  }}
                  onClick={() => enableSorting && column.enableSorting !== false && handleSorting(column.id)}
                >
                  <div className="flex items-center gap-2">
                    {typeof column.header === 'string' ? column.header : column.header}
                    {enableSorting && column.enableSorting !== false && (
                      <div className="flex flex-col">
                        {(() => {
                          const sort = state.sorting.find(s => s.id === column.id)
                          if (!sort) {
                            return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
                          }
                          return sort.desc 
                            ? <ChevronDown className="h-3 w-3" />
                            : <ChevronUp className="h-3 w-3" />
                        })()}
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dataToRender.length === 0 ? (
              <TableRow>
                <TableCell colSpan={displayColumns.length} className="h-24 text-center">
                  {emptyState || "No data available."}
                </TableCell>
              </TableRow>
            ) : (
              dataToRender.map((row, index) => (
                <TableRow key={index} className="data-table-row">
                  {displayColumns.map((column) => {
                    const cellValue = column.accessorFn 
                      ? column.accessorFn(row)
                      : column.accessorKey 
                        ? (row[column.accessorKey] as unknown)
                        : null

                    return (
                      <TableCell key={column.id} className="data-table-cell">
                        {column.cell 
                          ? column.cell({ row, value: cellValue, column })
                          : cellValue !== null && cellValue !== undefined 
                            ? String(cellValue)
                            : "-"
                        }
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {enablePagination && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page:</span>
            <Select
              value={String(state.pagination.pageSize)}
              onValueChange={(value) => handlePageSizeChange(Number(value))}
            >
              <SelectTrigger className="w-[70px] h-8" aria-label="Select page size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>
              Showing {dataToRender.length > 0 ? state.pagination.pageIndex * state.pagination.pageSize + 1 : 0} to{" "}
              {Math.min((state.pagination.pageIndex + 1) * state.pagination.pageSize, totalRows)} of{" "}
              {totalRows} entries
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(0)}
              disabled={!canPreviousPage}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(state.pagination.pageIndex - 1)}
              disabled={!canPreviousPage}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {state.pagination.pageIndex + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(state.pagination.pageIndex + 1)}
              disabled={!canNextPage}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages - 1)}
              disabled={!canNextPage}
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export { dataTableVariants }
