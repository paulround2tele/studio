# Pagination

Content pagination controls that help users navigate through multiple pages of data.

## Overview

The Pagination component provides intuitive navigation for multi-page content. It supports various display styles, automatic ellipsis handling, customizable visible page ranges, and accessibility features for screen readers and keyboard navigation.

## Import

```typescript
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationButton,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
  SimplePagination 
} from '@/components/ui/pagination'
```

## Basic Usage

### Simple Pagination

```tsx
const [currentPage, setCurrentPage] = useState(1)
const totalPages = 20

<SimplePagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={setCurrentPage}
/>
```

### Manual Construction

```tsx
<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious href="#" />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#" isActive>1</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">2</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationEllipsis />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">10</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationNext href="#" />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

## Variants

### Visual Variants

```tsx
// Default styling
<SimplePagination variant="default" {...props} />

// Outlined buttons
<SimplePagination variant="outline" {...props} />

// Ghost styling
<SimplePagination variant="ghost" {...props} />

// Minimal styling
<SimplePagination variant="minimal" {...props} />
```

### Sizes

```tsx
// Small pagination
<SimplePagination size="sm" {...props} />

// Default size
<SimplePagination size="default" {...props} />

// Large pagination
<SimplePagination size="lg" {...props} />
```

## Configuration Options

### Show/Hide Elements

```tsx
// With Previous/Next buttons
<SimplePagination
  showPreviousNext={true}
  {...props}
/>

// With First/Last buttons
<SimplePagination
  showFirstLast={true}
  {...props}
/>

// Combined
<SimplePagination
  showPreviousNext={true}
  showFirstLast={true}
  {...props}
/>
```

### Visible Page Range

```tsx
// Show 5 page numbers maximum
<SimplePagination
  maxVisible={5}
  {...props}
/>

// Show 9 page numbers maximum
<SimplePagination
  maxVisible={9}
  {...props}
/>

// Minimal display (3 pages)
<SimplePagination
  maxVisible={3}
  {...props}
/>
```

### Disabled State

```tsx
<SimplePagination
  disabled={isLoading}
  {...props}
/>
```

## Advanced Examples

### Table Pagination

```tsx
const TableWithPagination = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const totalItems = 250
  const totalPages = Math.ceil(totalItems / pageSize)

  return (
    <div className="space-y-4">
      {/* Data Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Table rows... */}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems} results
          </p>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select value={pageSize.toString()} onValueChange={(value) => {
              setPageSize(Number(value))
              setCurrentPage(1)
            }}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <SimplePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            variant="outline"
            size="sm"
          />
        </div>
      </div>
    </div>
  )
}
```

### Search Results Pagination

```tsx
const SearchResults = ({ query, results }) => {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20
  const totalPages = Math.ceil(results.total / pageSize)
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Search Results for "{query}"
        </h2>
        <p className="text-sm text-muted-foreground">
          {results.total} results found
        </p>
      </div>
      
      {/* Results */}
      <div className="space-y-4">
        {results.items.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <h3 className="font-medium">{item.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <SimplePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            variant="outline"
            showFirstLast={true}
            maxVisible={7}
          />
        </div>
      )}
    </div>
  )
}
```

### Blog Post Pagination

```tsx
const BlogPagination = ({ posts, currentPage, totalPages }) => {
  const router = useRouter()
  
  const handlePageChange = (page: number) => {
    router.push(`/blog?page=${page}`)
  }
  
  const previousPost = posts[currentPage - 2]
  const nextPost = posts[currentPage]
  
  return (
    <div className="space-y-8">
      {/* Standard Pagination */}
      <SimplePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        variant="ghost"
        showPreviousNext={true}
      />
      
      {/* Post Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {previousPost && (
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-2">Previous Post</p>
              <h3 className="font-medium">{previousPost.title}</h3>
            </CardContent>
          </Card>
        )}
        
        {nextPost && (
          <Card className="cursor-pointer hover:shadow-md transition-shadow ml-auto">
            <CardContent className="p-4 text-right">
              <p className="text-sm text-muted-foreground mb-2">Next Post</p>
              <h3 className="font-medium">{nextPost.title}</h3>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
```

### Mobile-Friendly Pagination

```tsx
const ResponsivePagination = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="flex flex-col space-y-4">
      {/* Mobile: Simple Previous/Next */}
      <div className="flex sm:hidden justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <span className="flex items-center text-sm">
          Page {currentPage} of {totalPages}
        </span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      
      {/* Desktop: Full Pagination */}
      <div className="hidden sm:block">
        <SimplePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          variant="outline"
          maxVisible={5}
        />
      </div>
    </div>
  )
}
```

### Infinite Scroll with Pagination

```tsx
const InfiniteScrollPagination = ({ hasMore, onLoadMore, isLoading }) => {
  return (
    <div className="space-y-4">
      {/* Load More Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={onLoadMore}
          disabled={!hasMore || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : hasMore ? (
            'Load More'
          ) : (
            'No More Results'
          )}
        </Button>
      </div>
      
      {/* Alternative: Traditional Pagination */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            /* Switch to traditional pagination */
          }}
        >
          View All Pages
        </Button>
      </div>
    </div>
  )
}
```

## API Reference

### SimplePagination Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currentPage` | `number` | - | Current active page |
| `totalPages` | `number` | - | Total number of pages |
| `onPageChange` | `(page: number) => void` | - | Page change handler |
| `variant` | `'default' \| 'outline' \| 'ghost' \| 'minimal'` | `'default'` | Visual variant |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Size variant |
| `showPreviousNext` | `boolean` | `true` | Show Previous/Next buttons |
| `showFirstLast` | `boolean` | `false` | Show First/Last buttons |
| `maxVisible` | `number` | `7` | Maximum visible page numbers |
| `disabled` | `boolean` | `false` | Disable all interactions |

### Individual Component Props

| Component | Props | Description |
|-----------|-------|-------------|
| `PaginationLink` | `isActive`, `href` | Navigation link |
| `PaginationButton` | `isActive`, `onClick` | Clickable button |
| `PaginationPrevious` | Standard link/button props | Previous page navigation |
| `PaginationNext` | Standard link/button props | Next page navigation |

### Utility Functions

```typescript
// Generate page number array with ellipsis
generatePaginationRange(
  currentPage: number, 
  totalPages: number, 
  maxVisible?: number
): (number | "ellipsis")[]
```

## Accessibility

- Full keyboard navigation (Tab, Enter, Space)
- Proper ARIA labels and current page indication
- Screen reader announcements for page changes
- Semantic navigation structure
- Focus management

### ARIA Attributes

```tsx
<Pagination aria-label="pagination">
  <PaginationButton aria-current="page" isActive>
    Current Page
  </PaginationButton>
</Pagination>
```

## Best Practices

### Do's
- Show pagination only when there are multiple pages
- Indicate current page clearly
- Provide Previous/Next for easy navigation
- Use reasonable page size limits
- Show total results count when helpful
- Consider mobile experience

### Don'ts
- Don't show pagination for single page
- Don't make page sizes too large or small
- Don't hide pagination controls entirely
- Don't forget loading states
- Don't break navigation with invalid URLs

## Design Tokens

```css
/* Pagination spacing */
--pagination-gap-sm: 0.125rem;
--pagination-gap-default: 0.25rem;
--pagination-gap-lg: 0.375rem;

/* Pagination item sizes */
--pagination-item-sm: 2rem;
--pagination-item-default: 2.25rem;
--pagination-item-lg: 2.5rem;

/* Pagination colors */
--pagination-bg: transparent;
--pagination-bg-hover: hsl(var(--accent));
--pagination-bg-active: hsl(var(--primary));
--pagination-text: hsl(var(--foreground));
--pagination-text-active: hsl(var(--primary-foreground));
```

## Related Components

- [Table](./table.md) - Common usage context
- [Button](../atomic/button.md) - Navigation actions
- [Select](../atomic/select.md) - Page size selector
- [Card](./card.md) - Content containers
