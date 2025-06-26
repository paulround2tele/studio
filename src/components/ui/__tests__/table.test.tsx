import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import '@testing-library/jest-dom'

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  type TableProps,
  type TableHeaderProps,
  type TableRowProps,
  type TableHeadProps,
  type TableCellProps
} from '../table'

expect.extend(toHaveNoViolations)

describe('Table Components', () => {
  // Test data
  const sampleData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' }
  ]

  const BasicTable = (props: Partial<TableProps> = {}) => (
    <Table {...props}>
      <TableCaption>Sample table caption</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sampleData.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.email}</TableCell>
            <TableCell>{item.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total: {sampleData.length} users</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  )

  describe('Table Component', () => {
    it('renders basic table structure correctly', () => {
      render(<BasicTable />)
      
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('Sample table caption')).toBeInTheDocument()
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
    })

    it('renders table data correctly', () => {
      render(<BasicTable />)
      
      sampleData.forEach(item => {
        expect(screen.getByText(item.name)).toBeInTheDocument()
        expect(screen.getByText(item.email)).toBeInTheDocument()
      })
      
      // Check specific status values exist (there are multiple "Active" so use getAllByText)
      expect(screen.getAllByText('Active')).toHaveLength(2)
      expect(screen.getByText('Inactive')).toBeInTheDocument()
      
      expect(screen.getByText('Total: 3 users')).toBeInTheDocument()
    })

    it('applies variant classes correctly', () => {
      const { rerender } = render(<BasicTable variant="default" />)
      
      let table = screen.getByRole('table')
      expect(table).toHaveClass('border-collapse')
      
      rerender(<BasicTable variant="striped" />)
      table = screen.getByRole('table')
      expect(table).toHaveClass('[&_tbody_tr:nth-child(even)]:bg-muted/30')
      
      rerender(<BasicTable variant="bordered" />)
      table = screen.getByRole('table')
      expect(table).toHaveClass('border', 'border-border')
      
      rerender(<BasicTable variant="minimal" />)
      table = screen.getByRole('table')
      expect(table).toHaveClass('border-collapse')
    })

    it('applies size classes correctly', () => {
      const { rerender } = render(<BasicTable size="sm" />)
      
      let table = screen.getByRole('table')
      expect(table).toHaveClass('text-xs')
      
      rerender(<BasicTable size="default" />)
      table = screen.getByRole('table')
      expect(table).toHaveClass('text-sm')
      
      rerender(<BasicTable size="lg" />)
      table = screen.getByRole('table')
      expect(table).toHaveClass('text-base')
    })

    it('applies custom containerClassName', () => {
      render(<BasicTable containerClassName="custom-container" />)
      
      const container = screen.getByRole('table').parentElement
      expect(container).toHaveClass('custom-container')
    })

    it('forwards props correctly', () => {
      render(<BasicTable data-testid="test-table" id="custom-table" />)
      
      const table = screen.getByRole('table')
      expect(table).toHaveAttribute('data-testid', 'test-table')
      expect(table).toHaveAttribute('id', 'custom-table')
    })
  })

  describe('TableHeader Component', () => {
    it('renders with default variant', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      )
      
      const header = screen.getByRole('rowgroup')
      expect(header).toBeInTheDocument()
    })

    it('applies variant classes correctly', () => {
      const { rerender } = render(
        <Table>
          <TableHeader variant="elevated">
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      )
      
      let header = screen.getByRole('rowgroup')
      expect(header).toHaveClass('bg-muted/50')
      
      rerender(
        <Table>
          <TableHeader variant="accent">
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      )
      header = screen.getByRole('rowgroup')
      expect(header).toHaveClass('bg-accent')
      
      rerender(
        <Table>
          <TableHeader variant="minimal">
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      )
      header = screen.getByRole('rowgroup')
      expect(header).toHaveClass('border-none')
    })
  })

  describe('TableRow Component', () => {
    it('applies variant classes correctly', () => {
      render(
        <Table>
          <TableBody>
            <TableRow variant="interactive" data-testid="interactive-row">
              <TableCell>Test</TableCell>
            </TableRow>
            <TableRow variant="static" data-testid="static-row">
              <TableCell>Test</TableCell>
            </TableRow>
            <TableRow variant="accent" data-testid="accent-row">
              <TableCell>Test</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      const interactiveRow = screen.getByTestId('interactive-row')
      expect(interactiveRow).toHaveClass('cursor-pointer')
      
      const staticRow = screen.getByTestId('static-row')
      expect(staticRow).not.toHaveClass('hover:bg-muted/50')
      
      const accentRow = screen.getByTestId('accent-row')
      expect(accentRow).toHaveClass('hover:bg-accent/50')
    })

    it('applies size classes correctly', () => {
      render(
        <Table>
          <TableBody>
            <TableRow size="sm" data-testid="sm-row">
              <TableCell>Test</TableCell>
            </TableRow>
            <TableRow size="default" data-testid="default-row">
              <TableCell>Test</TableCell>
            </TableRow>
            <TableRow size="lg" data-testid="lg-row">
              <TableCell>Test</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      expect(screen.getByTestId('sm-row')).toHaveClass('h-8')
      expect(screen.getByTestId('default-row')).toHaveClass('h-12')
      expect(screen.getByTestId('lg-row')).toHaveClass('h-16')
    })

    it('handles click events when interactive', async () => {
      const handleClick = jest.fn()
      const user = userEvent.setup()
      
      render(
        <Table>
          <TableBody>
            <TableRow variant="interactive" onClick={handleClick}>
              <TableCell>Clickable row</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      const row = screen.getByRole('row')
      await user.click(row)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('TableHead Component', () => {
    it('applies size classes correctly', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead size="sm" data-testid="sm-head">Small</TableHead>
              <TableHead size="default" data-testid="default-head">Default</TableHead>
              <TableHead size="lg" data-testid="lg-head">Large</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      )
      
      expect(screen.getByTestId('sm-head')).toHaveClass('h-8', 'px-2', 'py-1')
      expect(screen.getByTestId('default-head')).toHaveClass('h-12', 'px-4')
      expect(screen.getByTestId('lg-head')).toHaveClass('h-16', 'px-6')
    })

    it('supports different content types', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Text Header</TableHead>
              <TableHead>
                <div className="flex items-center gap-2">
                  <span>Complex Header</span>
                  <button>Sort</button>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      )
      
      expect(screen.getByText('Text Header')).toBeInTheDocument()
      expect(screen.getByText('Complex Header')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sort' })).toBeInTheDocument()
    })
  })

  describe('TableCell Component', () => {
    it('applies size classes correctly', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell size="sm" data-testid="sm-cell">Small</TableCell>
              <TableCell size="default" data-testid="default-cell">Default</TableCell>
              <TableCell size="lg" data-testid="lg-cell">Large</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      expect(screen.getByTestId('sm-cell')).toHaveClass('p-2')
      expect(screen.getByTestId('default-cell')).toHaveClass('p-4')
      expect(screen.getByTestId('lg-cell')).toHaveClass('p-6')
    })

    it('handles different content types', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Text content</TableCell>
              <TableCell>
                <button>Button</button>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <span>Multiple</span>
                  <span>Elements</span>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      expect(screen.getByText('Text content')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Button' })).toBeInTheDocument()
      expect(screen.getByText('Multiple')).toBeInTheDocument()
      expect(screen.getByText('Elements')).toBeInTheDocument()
    })

    it('supports colspan attribute', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell colSpan={3} data-testid="spanning-cell">
                Spanning cell
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      const cell = screen.getByTestId('spanning-cell')
      expect(cell).toHaveAttribute('colSpan', '3')
    })
  })

  describe('Responsive Behavior', () => {
    it('handles overflow with scroll container', () => {
      render(<BasicTable />)
      
      const container = screen.getByRole('table').parentElement
      expect(container).toHaveClass('overflow-auto')
    })

    it('maintains table structure with many columns', () => {
      const WideTable = () => (
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 10 }, (_, i) => (
                <TableHead key={i}>Column {i + 1}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              {Array.from({ length: 10 }, (_, i) => (
                <TableCell key={i}>Cell {i + 1}</TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      )
      
      render(<WideTable />)
      
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByText(`Column ${i}`)).toBeInTheDocument()
        expect(screen.getByText(`Cell ${i}`)).toBeInTheDocument()
      }
    })
  })

  describe('Accessibility', () => {
    it('has proper table semantics', async () => {
      render(<BasicTable />)
      
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getAllByRole('row')).toHaveLength(5) // Header + 3 data + footer
      expect(screen.getAllByRole('columnheader')).toHaveLength(3)
      expect(screen.getAllByRole('cell')).toHaveLength(10) // 3 data rows × 3 cells + 1 footer cell
    })

    it('supports ARIA attributes', () => {
      render(
        <Table aria-label="User data table" aria-describedby="table-description">
          <TableCaption id="table-description">
            A table showing user information
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John Doe</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      const table = screen.getByRole('table')
      expect(table).toHaveAttribute('aria-label', 'User data table')
      expect(table).toHaveAttribute('aria-describedby', 'table-description')
    })

    it('meets accessibility standards', async () => {
      const { container } = render(<BasicTable />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('supports keyboard navigation for interactive rows', async () => {
      const handleKeyDown = jest.fn()
      const user = userEvent.setup()
      
      render(
        <Table>
          <TableBody>
            <TableRow variant="interactive" tabIndex={0} onKeyDown={handleKeyDown}>
              <TableCell>Interactive row</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      const row = screen.getByRole('row')
      await user.tab()
      expect(row).toHaveFocus()
      
      await user.keyboard('{Enter}')
      expect(handleKeyDown).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'Enter' })
      )
    })
  })

  describe('Edge Cases', () => {
    it('handles empty table', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>No data available</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      expect(screen.getByText('No data available')).toBeInTheDocument()
    })

    it('handles table with only headers', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header 1</TableHead>
              <TableHead>Header 2</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      )
      
      expect(screen.getByText('Header 1')).toBeInTheDocument()
      expect(screen.getByText('Header 2')).toBeInTheDocument()
    })

    it('handles very long cell content', () => {
      const longText = 'This is a very long text that should be handled gracefully by the table cell component and should not break the layout or cause overflow issues'
      
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="max-w-xs truncate" title={longText}>
                {longText}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      const cell = screen.getByRole('cell')
      expect(cell).toHaveAttribute('title', longText)
      expect(cell).toHaveClass('truncate')
    })

    it('handles null and undefined values', () => {
      const dataWithNulls = [
        { name: 'John', email: null, status: undefined },
        { name: null, email: 'test@example.com', status: 'Active' }
      ]
      
      render(
        <Table>
          <TableBody>
            {dataWithNulls.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.name || '-'}</TableCell>
                <TableCell>{item.email || '-'}</TableCell>
                <TableCell>{item.status || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )
      
      const cells = screen.getAllByRole('cell')
      expect(cells).toHaveLength(6)
      expect(screen.getAllByText('-')).toHaveLength(3)
    })
  })

  describe('Performance', () => {
    it('renders efficiently with many rows', () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        status: i % 2 === 0 ? 'Active' : 'Inactive'
      }))
      
      const start = performance.now()
      
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {largeData.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.email}</TableCell>
                <TableCell>{item.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )
      
      const end = performance.now()
      const renderTime = end - start
      
      // Should render within reasonable time (less than 100ms for 100 rows)
      expect(renderTime).toBeLessThan(100)
      expect(screen.getByText('User 99')).toBeInTheDocument()
    })
  })
})
