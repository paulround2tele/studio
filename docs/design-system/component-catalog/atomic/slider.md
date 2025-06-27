# Slider

Range input control for selecting numeric values within a specified range.

## Overview

The Slider component provides an intuitive way for users to select numeric values by dragging a thumb along a track. It supports various sizes, orientations, visual variants, and advanced features like marks and value display.

## Import

```typescript
import { Slider } from '@/components/ui/slider'
```

## Basic Usage

```tsx
// Simple slider
<Slider defaultValue={[50]} max={100} step={1} />

// Controlled slider
const [value, setValue] = useState([25])
<Slider value={value} onValueChange={setValue} />

// Range slider (multiple thumbs)
<Slider defaultValue={[20, 80]} max={100} step={5} />
```

## Variants

### Visual Variants

```tsx
// Default primary styling
<Slider variant="default" defaultValue={[50]} />

// Destructive/error state
<Slider variant="destructive" defaultValue={[50]} />

// Success state
<Slider variant="success" defaultValue={[50]} />

// Warning state
<Slider variant="warning" defaultValue={[50]} />
```

### Sizes

```tsx
// Small slider
<Slider size="sm" defaultValue={[50]} />

// Medium slider (default)
<Slider size="md" defaultValue={[50]} />

// Large slider
<Slider size="lg" defaultValue={[50]} />
```

## Orientations

### Horizontal (Default)

```tsx
<Slider 
  orientation="horizontal" 
  defaultValue={[50]} 
  className="w-full" 
/>
```

### Vertical

```tsx
<Slider 
  orientation="vertical" 
  defaultValue={[50]} 
  className="h-48" 
/>
```

## Value Display Options

### Show Current Value

```tsx
<Slider 
  defaultValue={[50]} 
  showValue={true}
  formatValue={(value) => `${value}%`}
/>
```

### Show Min/Max Labels

```tsx
<Slider 
  defaultValue={[50]} 
  showLabels={true}
  min={0}
  max={100}
  formatValue={(value) => `$${value}`}
/>
```

### Custom Value Formatting

```tsx
<Slider 
  defaultValue={[50]} 
  showValue={true}
  formatValue={(value) => {
    if (value < 25) return 'Low'
    if (value < 75) return 'Medium'
    return 'High'
  }}
/>
```

## Marks and Steps

### Basic Marks

```tsx
<Slider 
  defaultValue={[50]} 
  showMarks={true}
  marks={[
    { value: 0 },
    { value: 25 },
    { value: 50 },
    { value: 75 },
    { value: 100 }
  ]}
/>
```

### Labeled Marks

```tsx
<Slider 
  defaultValue={[50]} 
  showMarks={true}
  marks={[
    { value: 0, label: 'Min' },
    { value: 25, label: 'Low' },
    { value: 50, label: 'Med' },
    { value: 75, label: 'High' },
    { value: 100, label: 'Max' }
  ]}
/>
```

### Custom Step Intervals

```tsx
// Fine-grained control
<Slider defaultValue={[50]} min={0} max={100} step={0.1} />

// Larger steps
<Slider defaultValue={[50]} min={0} max={100} step={10} />
```

## Advanced Examples

### Volume Control

```tsx
const [volume, setVolume] = useState([75])

<div className="space-y-2">
  <Label>Volume</Label>
  <div className="flex items-center space-x-3">
    <VolumeX className="h-4 w-4 text-muted-foreground" />
    <Slider
      value={volume}
      onValueChange={setVolume}
      max={100}
      step={1}
      className="flex-1"
      size="sm"
      formatValue={(value) => `${value}%`}
    />
    <Volume2 className="h-4 w-4 text-muted-foreground" />
  </div>
  <p className="text-sm text-muted-foreground">
    Current volume: {volume[0]}%
  </p>
</div>
```

### Price Range Filter

```tsx
const [priceRange, setPriceRange] = useState([100, 500])

<div className="space-y-3">
  <Label>Price Range</Label>
  <Slider
    value={priceRange}
    onValueChange={setPriceRange}
    max={1000}
    min={0}
    step={25}
    showValue={true}
    showLabels={true}
    formatValue={(value) => `$${value}`}
    className="px-3"
  />
  <div className="flex justify-between text-sm text-muted-foreground">
    <span>Min: ${priceRange[0]}</span>
    <span>Max: ${priceRange[1]}</span>
  </div>
</div>
```

### Rating Slider

```tsx
const [rating, setRating] = useState([3])

<div className="space-y-3">
  <Label>Rating</Label>
  <Slider
    value={rating}
    onValueChange={setRating}
    max={5}
    min={1}
    step={1}
    showMarks={true}
    marks={[
      { value: 1, label: '⭐' },
      { value: 2, label: '⭐⭐' },
      { value: 3, label: '⭐⭐⭐' },
      { value: 4, label: '⭐⭐⭐⭐' },
      { value: 5, label: '⭐⭐⭐⭐⭐' }
    ]}
    variant="warning"
  />
  <p className="text-center">
    {rating[0]} star{rating[0] !== 1 ? 's' : ''}
  </p>
</div>
```

### Time Range Selector

```tsx
const [timeRange, setTimeRange] = useState([9, 17])

const formatTime = (hour: number) => {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:00 ${period}`
}

<div className="space-y-3">
  <Label>Working Hours</Label>
  <Slider
    value={timeRange}
    onValueChange={setTimeRange}
    max={23}
    min={0}
    step={1}
    showValue={true}
    showLabels={true}
    formatValue={formatTime}
  />
  <p className="text-sm text-muted-foreground text-center">
    Working from {formatTime(timeRange[0])} to {formatTime(timeRange[1])}
  </p>
</div>
```

### Vertical Progress Indicator

```tsx
const [progress, setProgress] = useState([65])

<div className="flex items-center space-x-4">
  <div className="text-sm font-medium">Progress</div>
  <Slider
    orientation="vertical"
    value={progress}
    onValueChange={setProgress}
    max={100}
    min={0}
    step={5}
    showValue={true}
    variant="success"
    size="lg"
    className="h-32"
    formatValue={(value) => `${value}%`}
  />
  <div className="text-sm text-muted-foreground">
    {progress[0]}% Complete
  </div>
</div>
```

## API Reference

### Slider Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number[]` | - | Controlled value(s) |
| `defaultValue` | `number[]` | `[0]` | Default value(s) |
| `onValueChange` | `(value: number[]) => void` | - | Value change handler |
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `step` | `number` | `1` | Step increment |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Slider direction |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Slider size |
| `variant` | `'default' \| 'destructive' \| 'success' \| 'warning'` | `'default'` | Visual variant |
| `showValue` | `boolean` | `false` | Show current value |
| `showLabels` | `boolean` | `false` | Show min/max labels |
| `showMarks` | `boolean` | `false` | Show tick marks |
| `marks` | `Array<{value: number, label?: string}>` | `[]` | Custom marks |
| `formatValue` | `(value: number) => string` | `toString` | Value formatter |
| `disabled` | `boolean` | `false` | Disable interaction |

## Accessibility

- Full keyboard navigation support (arrow keys, Home, End, Page Up/Down)
- Proper ARIA attributes and roles
- Screen reader announcements for value changes
- Focus management and visual indicators
- Supports assistive technology

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←/↓` | Decrease value by one step |
| `→/↑` | Increase value by one step |
| `Home` | Set to minimum value |
| `End` | Set to maximum value |
| `Page Down` | Decrease by 10% of range |
| `Page Up` | Increase by 10% of range |

## Best Practices

### Do's
- Provide clear labels and value feedback
- Use appropriate step sizes for the use case
- Include min/max labels for context
- Use marks for important values
- Choose appropriate size for the interface
- Consider using range sliders for filters

### Don'ts
- Don't use sliders for precise value entry
- Don't make step sizes too small for touch devices
- Don't use sliders for binary choices (use Switch instead)
- Don't forget to handle edge cases (min/max values)

## Design Tokens

```css
/* Slider track */
--slider-track-bg: hsl(var(--secondary));
--slider-track-height-sm: 4px;
--slider-track-height-md: 8px;
--slider-track-height-lg: 12px;

/* Slider range */
--slider-range-bg: hsl(var(--primary));
--slider-range-destructive: hsl(var(--destructive));
--slider-range-success: hsl(var(--green-500));
--slider-range-warning: hsl(var(--yellow-500));

/* Slider thumb */
--slider-thumb-size-sm: 12px;
--slider-thumb-size-md: 20px;
--slider-thumb-size-lg: 24px;
--slider-thumb-bg: hsl(var(--background));
--slider-thumb-border: 2px solid hsl(var(--primary));
```

## Related Components

- [Input](./input.md) - For precise numeric entry
- [Switch](./switch.md) - For binary toggles
- [Progress](./progress.md) - For displaying progress
- [Form](../organism/form.md) - Form integration
