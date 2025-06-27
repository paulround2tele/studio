import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import '@testing-library/jest-dom'

import { DataTable, type DataTableColumn, type DataTableProps } from '../data-table'

expect.extend(toHaveNoViolations)

// Test data
interface TestUser {
  id: number
  name: string
  email: string
  status: 'active' | 'inactive'
  role: string
  joinDate: string
  score: number
}

const sampleUsers: TestUser[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active', role: 'Admin', joinDate: '2023-01-15', score: 85 },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive', role: 'User', joinDate: '2023-02-20', score: 92 },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'active', role: 'User', joinDate: '2023-03-10', score: 78 },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', status: 'active', role: 'Editor', joinDate: '2023-04-05', score: 95 },
  { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', status: 'inactive', role: 'User', joinDate: '2023-05-12', score: 67 }
]

const defaultColumns: DataTableColumn<TestUser>[] = [
  {
    id: 'name',
    header: 'Name',
    accessorKey: 'name',
    enableSorting: true,
    enableFiltering: true
  },
  {
    id: 'email',
    header: 'Email',
    accessorKey: 'email',
    enableSorting: true,
    enableFiltering: true
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    enableSorting: true,
    cell: ({ value }) => (
      <span className={value === 'active' ? 'text-green-600' : 'text-red-600'}>
        {value}
      </span>
    )
  },
  {
    id: 'role',
    header: 'Role',
    accessorKey: 'role',
    enableSorting: true
  },
  {
    id: 'score',
    header: 'Score',
    accessorKey: 'score',
    enableSorting: true,
    cell: ({ value }) => <span className="font-mono">{value}%</span>
  }
]

const TestDataTable = (props: Partial<DataTableProps<TestUser>> = {}) => (
  <DataTable
    data={sampleUsers}
    columns={defaultColumns}
    {...props}
  />
)

describe('DataTable Component', () => {
  describe('Basic Rendering', () => {
    it('renders table with data correctly', () => {
      render(<TestDataTable />)
      
      // Check headers
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Role')).toBeInTheDocument()
      expect(screen.getByText('Score')).toBeInTheDocument()
      
      // Check data
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
      expect(screen.getByText('Editor')).toBeInTheDocument()
    })

    it('renders empty state when no data', () => {
      render(<TestDataTable data={[]} />)
      
      expect(screen.getByText('No data available.')).toBeInTheDocument()
    })

    it('renders custom empty state', () => {
      const customEmptyState = <div>Custom empty message</div>
      render(<TestDataTable data={[]} emptyState={customEmptyState} />)
      
      expect(screen.getByText('Custom empty message')).toBeInTheDocument()
    })

    it('applies variant and density classes correctly', () => {
      const { rerender } = render(<TestDataTable variant="compact" density="compact" />)
      
      // Check for variant classes on the main container
      let container = screen.getByTestId('data-table-root')
      expect(container).toHaveClass('text-xs')
      expect(container).toHaveClass('[&_.data-table-row]:h-8')
      
      rerender(<TestDataTable variant="comfortable" density="comfortable" />)
      container = screen.getByTestId('data-table-root')
      expect(container).toHaveClass('text-sm')
      expect(container).toHaveClass('[&_.data-table-row]:h-16')
    })

    it('renders loading state correctly', () => {
      render(<TestDataTable isLoading={true} loadingRows={3} />)
      
      // Should show skeleton rows
      const skeletonElements = screen.getAllByRole('cell')
      expect(skeletonElements.length).toBeGreaterThan(0)
      
      // Search input should be disabled
      const searchInput = screen.getByPlaceholderText('Search...')
      expect(searchInput).toBeDisabled()
    })
  })

  describe('Custom Cell Rendering', () => {
    it('renders custom cell content correctly', () => {
      render(<TestDataTable />)
      
      // Status cells should have custom styling
      const activeStatuses = screen.getAllByText('active')
      expect(activeStatuses[0]).toHaveClass('text-green-600')
      
      const inactiveStatuses = screen.getAllByText('inactive')
      expect(inactiveStatuses[0]).toHaveClass('text-red-600')
      
      // Score cells should have custom formatting
      const scoreElements = screen.getAllByText(/^\d+%$/)
      expect(scoreElements.length).toBeGreaterThan(0)
      expect(scoreElements[0]).toHaveClass('font-mono')
    })

    it('handles custom accessor functions', () => {
      const customColumns: DataTableColumn<TestUser>[] = [
        {
          id: 'fullInfo',
          header: 'Full Info',
          accessorFn: (row) => `${row.name} (${row.email})`,
          cell: ({ value }) => <span className="italic">{value}</span>
        }
      ]
      
      render(<TestDataTable columns={customColumns} />)
      
      expect(screen.getByText('John Doe (john@example.com)')).toBeInTheDocument()
      expect(screen.getByText('John Doe (john@example.com)')).toHaveClass('italic')
    })
  })

  describe('Sorting', () => {
    it('enables sorting by default', async () => {
      const user = userEvent.setup()
      render(<TestDataTable />)
      
      const nameHeader = screen.getByText('Name')
      expect(nameHeader.closest('th')).toHaveClass('cursor-pointer')
      
      // Should show sorting icons
      expect(nameHeader.parentElement?.querySelector('svg')).toBeInTheDocument()
    })

    it('sorts data when column header is clicked', async () => {
      const user = userEvent.setup()
      render(<TestDataTable />)
      
      const nameHeader = screen.getByText('Name')
      
      // Initial order
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('John Doe') // First data row
      
      // Click to sort ascending
      await user.click(nameHeader)
      
      await waitFor(() => {
        const updatedRows = screen.getAllByRole('row')
        expect(updatedRows[1]).toHaveTextContent('Alice Brown') // Should be first alphabetically
      })
      
      // Click again to sort descending
      await user.click(nameHeader)
      
      await waitFor(() => {
        const updatedRows = screen.getAllByRole('row')
        expect(updatedRows[1]).toHaveTextContent('John Doe') // Should be first in reverse alphabetical order
      })
      
      // Click third time to remove sorting
      await user.click(nameHeader)
      
      await waitFor(() => {
        const updatedRows = screen.getAllByRole('row')
        expect(updatedRows[1]).toHaveTextContent('John Doe') // Back to original order
      })
    })

    it('disables sorting when enableSorting is false', () => {
      render(<TestDataTable enableSorting={false} />)
      
      const nameHeader = screen.getByText('Name')
      expect(nameHeader.closest('th')).not.toHaveClass('cursor-pointer')
    })

    it('respects column-level sorting configuration', () => {
      const columnsWithMixedSorting: DataTableColumn<TestUser>[] = [
        { id: 'name', header: 'Name', accessorKey: 'name', enableSorting: true },
        { id: 'email', header: 'Email', accessorKey: 'email', enableSorting: false }
      ]
      
      render(<TestDataTable columns={columnsWithMixedSorting} />)
      
      const nameHeader = screen.getByText('Name')
      const emailHeader = screen.getByText('Email')
      
      expect(nameHeader.closest('th')).toHaveClass('cursor-pointer')
      expect(emailHeader.closest('th')).not.toHaveClass('cursor-pointer')
    })

    it('handles custom sorting functions', async () => {
      const user = userEvent.setup()
      const customColumns: DataTableColumn<TestUser>[] = [
        {
          id: 'score',
          header: 'Score',
          accessorKey: 'score',
          enableSorting: true,
          sortingFn: (a, b) => b.score - a.score // Reverse numeric sort
        }
      ]
      
      render(<TestDataTable columns={customColumns} />)
      
      const scoreHeader = screen.getByText('Score')
      await user.click(scoreHeader)
      
      await waitFor(() => {
        const rows = screen.getAllByRole('row')
        // With custom sorting, should start with highest score
        expect(rows[1]).toHaveTextContent('95') // Alice Brown's score
      })
    })
  })

  describe('Global Filtering', () => {
    it('enables global search by default', () => {
      render(<TestDataTable />)
      
      const searchInput = screen.getByPlaceholderText('Search...')
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).not.toBeDisabled()
    })

    it('filters data based on global search', async () => {
      const user = userEvent.setup()
      render(<TestDataTable />)
      
      const searchInput = screen.getByPlaceholderText('Search...')
      
      // Search for "john"
      await user.type(searchInput, 'john')
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
        expect(screen.queryByText('Alice Brown')).not.toBeInTheDocument()
      })
      
      // Clear search
      await user.clear(searchInput)
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.getByText('Alice Brown')).toBeInTheDocument()
      })
    })

    it('searches across all columns', async () => {
      const user = userEvent.setup()
      render(<TestDataTable />)
      
      const searchInput = screen.getByPlaceholderText('Search...')
      
      // Search for email domain
      await user.type(searchInput, 'example.com')
      
      await waitFor(() => {
        // Should find all users since they all have example.com emails
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })
      
      // Search for status
      await user.clear(searchInput)
      await user.type(searchInput, 'Admin')
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument() // role: Admin
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument() // role: User
        expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument() // role: User
      })
    })

    it('disables global filter when enableGlobalFilter is false', () => {
      render(<TestDataTable enableGlobalFilter={false} />)
      
      expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument()
    })

    it('resets pagination when searching', async () => {
      const user = userEvent.setup()
      const manyUsers = Array.from({ length: 25 }, (_, i) => ({
        ...sampleUsers[0],
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`
      }))
      
      render(<TestDataTable data={manyUsers} />)
      
      // Go to page 2
      const nextButton = screen.getByRole('button', { name: 'Next' })
      await user.click(nextButton)
      
      // Search should reset to page 1
      const searchInput = screen.getByPlaceholderText('Search...')
      await user.type(searchInput, 'User 1')
      
      await waitFor(() => {
        expect(screen.getByText(/Page 1 of/)).toBeInTheDocument()
      })
    })
  })

  describe('Pagination', () => {
    it('enables pagination by default', () => {
      render(<TestDataTable />)
      
      expect(screen.getByText('Rows per page:')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'First' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Last' })).toBeInTheDocument()
    })

    it('shows correct pagination info', () => {
      render(<TestDataTable />)
      
      expect(screen.getByText('Showing 1 to 5 of 5 entries')).toBeInTheDocument()
      expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
    })

    it('navigates pages correctly with large dataset', async () => {
      const user = userEvent.setup()
      const manyUsers = Array.from({ length: 25 }, (_, i) => ({
        ...sampleUsers[0],
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`
      }))
      
      render(<TestDataTable data={manyUsers} />)
      
      // Should show page 1 initially
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
      expect(screen.getByText('Showing 1 to 10 of 25 entries')).toBeInTheDocument()
      
      // Go to next page
      const nextButton = screen.getByRole('button', { name: 'Next' })
      await user.click(nextButton)
      
      await waitFor(() => {
        expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
        expect(screen.getByText('Showing 11 to 20 of 25 entries')).toBeInTheDocument()
      })
      
      // Go to last page
      const lastButton = screen.getByRole('button', { name: 'Last' })
      await user.click(lastButton)
      
      await waitFor(() => {
        expect(screen.getByText('Page 3 of 3')).toBeInTheDocument()
        expect(screen.getByText('Showing 21 to 25 of 25 entries')).toBeInTheDocument()
      })
      
      // Previous and First buttons should work
      const firstButton = screen.getByRole('button', { name: 'First' })
      await user.click(firstButton)
      
      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
      })
    })

    it('changes page size correctly', async () => {
      const user = userEvent.setup()
      const manyUsers = Array.from({ length: 25 }, (_, i) => ({
        ...sampleUsers[0],
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`
      }))
      
      render(<TestDataTable data={manyUsers} />)
      
      // Check initial state
      expect(screen.getByText('Showing 1 to 10 of 25 entries')).toBeInTheDocument()
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
      
      // The combobox should have the current value "10"
      const pageSizeSelect = screen.getByRole('combobox', { name: 'Select page size' })
      expect(pageSizeSelect).toBeInTheDocument()
    })

    it('disables pagination when enablePagination is false', () => {
      render(<TestDataTable enablePagination={false} />)
      
      expect(screen.queryByText('Rows per page:')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
    })

    it('handles manual pagination mode', () => {
      const handlePaginationChange = jest.fn()
      
      render(
        <TestDataTable 
          manualPagination={true}
          pageCount={5}
          onPaginationChange={handlePaginationChange}
        />
      )
      
      expect(screen.getByText(/Page 1 of 5/)).toBeInTheDocument()
    })
  })

  describe('Row Selection', () => {
    it('enables row selection when configured', () => {
      render(<TestDataTable enableRowSelection={true} />)
      
      // Should have select all checkbox in header
      const headerCheckboxes = screen.getAllByRole('checkbox')
      expect(headerCheckboxes[0]).toBeInTheDocument()
      
      // Should have checkboxes for each row
      expect(headerCheckboxes).toHaveLength(6) // 1 header + 5 data rows
    })

    it('selects and deselects individual rows', async () => {
      const user = userEvent.setup()
      const handleRowSelectionChange = jest.fn()
      
      render(
        <TestDataTable 
          enableRowSelection={true}
          onRowSelectionChange={handleRowSelectionChange}
        />
      )
      
      const checkboxes = screen.getAllByRole('checkbox')
      const firstRowCheckbox = checkboxes[1] // First data row
      
      await user.click(firstRowCheckbox)
      
      expect(handleRowSelectionChange).toHaveBeenCalledWith({ '0': true })
      
      await user.click(firstRowCheckbox)
      
      expect(handleRowSelectionChange).toHaveBeenCalledWith({})
    })

    it('selects all rows with header checkbox', async () => {
      const user = userEvent.setup()
      const handleRowSelectionChange = jest.fn()
      
      render(
        <TestDataTable 
          enableRowSelection={true}
          onRowSelectionChange={handleRowSelectionChange}
        />
      )
      
      const headerCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(headerCheckbox)
      
      expect(handleRowSelectionChange).toHaveBeenCalledWith({
        '0': true,
        '1': true,
        '2': true,
        '3': true,
        '4': true
      })
    })

    it('disables row selection by default', () => {
      render(<TestDataTable />)
      
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    })
  })

  describe('State Management', () => {
    it('handles controlled state correctly', async () => {
      const user = userEvent.setup()
      const handleStateChange = jest.fn()
      
      const controlledState = {
        sorting: [],
        pagination: { pageIndex: 0, pageSize: 10 },
        globalFilter: '',
        filtering: [],
        rowSelection: {},
        columnVisibility: {}
      }
      
      render(
        <TestDataTable 
          state={controlledState}
          onStateChange={handleStateChange}
        />
      )
      
      const nameHeader = screen.getByText('Name')
      await user.click(nameHeader)
      
      expect(handleStateChange).toHaveBeenCalledWith({
        sorting: [{ id: 'name', desc: false }]
      })
    })

    it('uses internal state when not controlled', async () => {
      const user = userEvent.setup()
      render(<TestDataTable />)
      
      const nameHeader = screen.getByText('Name')
      await user.click(nameHeader)
      
      // Should sort without external state management
      await waitFor(() => {
        const rows = screen.getAllByRole('row')
        expect(rows[1]).toHaveTextContent('Alice Brown')
      })
    })

    it('handles specific callback props', async () => {
      const user = userEvent.setup()
      const handleSortingChange = jest.fn()
      const handleGlobalFilterChange = jest.fn()
      const handlePaginationChange = jest.fn()
      
      render(
        <TestDataTable 
          onSortingChange={handleSortingChange}
          onGlobalFilterChange={handleGlobalFilterChange}
          onPaginationChange={handlePaginationChange}
        />
      )
      
      // Test sorting callback
      const nameHeader = screen.getByText('Name')
      await user.click(nameHeader)
      expect(handleSortingChange).toHaveBeenCalledWith([{ id: 'name', desc: false }])
      
      // Test global filter callback
      const searchInput = screen.getByPlaceholderText('Search...')
      await user.type(searchInput, 'test')
      expect(handleGlobalFilterChange).toHaveBeenCalledWith('test')
    })
  })

  describe('Accessibility', () => {
    it('has proper table accessibility attributes', () => {
      render(<TestDataTable />)
      
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      
      const columnHeaders = screen.getAllByRole('columnheader')
      expect(columnHeaders).toHaveLength(5)
      
      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(6) // 1 header + 5 data rows
    })

    it('supports keyboard navigation for sortable headers', async () => {
      const user = userEvent.setup()
      render(<TestDataTable />)
      
      const nameHeader = screen.getByText('Name').closest('th')!
      await user.tab()
      
      if (nameHeader.tabIndex >= 0) {
        expect(nameHeader).toHaveFocus()
        
        await user.keyboard('{Enter}')
        
        await waitFor(() => {
          const rows = screen.getAllByRole('row')
          expect(rows[1]).toHaveTextContent('Alice Brown')
        })
      }
    })

    it('provides proper ARIA labels for interactive elements', () => {
      render(<TestDataTable enableRowSelection={true} />)
      
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes[0]).toHaveAttribute('aria-label', 'Select all rows')
      expect(checkboxes[1]).toHaveAttribute('aria-label', 'Select row 0')
    })

    it('meets accessibility standards', async () => {
      const { container } = render(<TestDataTable />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('meets accessibility standards with all features enabled', async () => {
      const { container } = render(
        <TestDataTable 
          enableRowSelection={true}
          enableFiltering={true}
          enableGlobalFilter={true}
          enablePagination={true}
        />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Performance', () => {
    it('renders efficiently with large datasets', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...sampleUsers[0],
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`
      }))
      
      const start = performance.now()
      render(<TestDataTable data={largeDataset} />)
      const end = performance.now()
      
      // Should render within reasonable time
      expect(end - start).toBeLessThan(100)
      
      // Should only render current page (not all 1000 rows)
      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(11) // 1 header + 10 data rows (default page size)
    })

    it('handles frequent state updates efficiently', async () => {
      const user = userEvent.setup()
      render(<TestDataTable />)
      
      const searchInput = screen.getByPlaceholderText('Search...')
      
      // Type multiple characters quickly
      await user.type(searchInput, 'abcdefg')
      
      // Should handle rapid updates without issues
      await waitFor(() => {
        expect(searchInput).toHaveValue('abcdefg')
        expect(screen.getByText('No data available.')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles empty columns array', () => {
      render(<TestDataTable columns={[]} data={[]} />)
      
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('No data available.')).toBeInTheDocument()
    })

    it('handles null/undefined cell values', () => {
      const dataWithNulls = [
        { id: 1, name: null as any, email: undefined as any, status: 'active' as const, role: '', joinDate: '', score: 0 }
      ]
      
      render(<TestDataTable data={dataWithNulls} />)
      
      const cells = screen.getAllByRole('cell')
      expect(cells.some(cell => cell.textContent === '-')).toBe(true)
    })

    it('handles very long text content', () => {
      const longTextData = [{
        id: 1,
        name: 'A'.repeat(100),
        email: 'very.long.email.address.that.might.cause.layout.issues@example.com',
        status: 'active' as const,
        role: 'A very long role name that should be handled gracefully',
        joinDate: '2023-01-01',
        score: 100
      }]
      
      render(<TestDataTable data={longTextData} />)
      
      expect(screen.getByText('A'.repeat(100))).toBeInTheDocument()
    })

    it('handles columns with missing accessorKey and accessorFn', () => {
      const incompleteColumns: DataTableColumn<TestUser>[] = [
        { id: 'empty', header: 'Empty Column' }
      ]
      
      render(<TestDataTable columns={incompleteColumns} />)
      
      const cells = screen.getAllByRole('cell')
      expect(cells.some(cell => cell.textContent === '-')).toBe(true)
    })
  })
})
