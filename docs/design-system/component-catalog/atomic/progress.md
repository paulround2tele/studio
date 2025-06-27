# Progress Component

## Overview

The Progress component provides a visual indicator for completion states, loading progress, and task advancement. Built on Radix UI primitives with smooth animations, multiple variants, sizes, and customizable value display.

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | `undefined` | Progress value (0-100) |
| `max` | `number` | `100` | Maximum value |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size of the progress bar |
| `variant` | `"default" \| "muted" \| "outline"` | `"default"` | Background variant |
| `indicatorVariant` | `"default" \| "destructive" \| "success" \| "warning" \| "info"` | `"default"` | Progress indicator color |
| `showValue` | `boolean` | `false` | Whether to display the progress value |
| `formatValue` | `(value: number) => string` | `undefined` | Custom value formatter |
| `className` | `string` | `undefined` | Additional CSS classes |

All Radix UI Progress props are also supported.

## Usage Examples

### Basic Progress

```tsx
import { Progress } from "@/components/ui/progress"

// Simple progress bar
<Progress value={33} />

// With value display
<Progress value={75} showValue />

// Different sizes
<Progress value={50} size="sm" />
<Progress value={50} size="default" />
<Progress value={50} size="lg" />
```

### Different Variants

```tsx
{/* Background variants */}
<div className="space-y-4">
  <Progress value={40} variant="default" />
  <Progress value={40} variant="muted" />
  <Progress value={40} variant="outline" />
</div>

{/* Indicator variants */}
<div className="space-y-4">
  <Progress value={60} indicatorVariant="default" />
  <Progress value={60} indicatorVariant="success" />
  <Progress value={60} indicatorVariant="warning" />
  <Progress value={60} indicatorVariant="destructive" />
  <Progress value={60} indicatorVariant="info" />
</div>
```

### With Custom Value Formatting

```tsx
// Percentage with custom formatting
<Progress 
  value={78} 
  showValue 
  formatValue={(value) => `${value.toFixed(1)}%`}
/>

// Custom units
<Progress 
  value={25} 
  max={50}
  showValue 
  formatValue={(value) => `${value}/50 items`}
/>

// File upload progress
<Progress 
  value={45} 
  showValue 
  formatValue={(value) => `${Math.round(value)}% uploaded`}
/>

// Time remaining
<Progress 
  value={80} 
  showValue 
  formatValue={(value) => {
    const remaining = Math.round((100 - value) / 10)
    return `${remaining}s remaining`
  }}
/>
```

### Loading States

```tsx
const [progress, setProgress] = useState(0)

useEffect(() => {
  const timer = setTimeout(() => setProgress(66), 500)
  return () => clearTimeout(timer)
}, [])

// Loading progress
<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span>Loading...</span>
    <span>{progress}%</span>
  </div>
  <Progress value={progress} />
</div>

// Indeterminate progress (animated)
<Progress className="animate-pulse" />
```

### Multi-Step Progress

```tsx
const steps = [
  { id: 1, title: "Personal Info", completed: true },
  { id: 2, title: "Address", completed: true },
  { id: 3, title: "Payment", completed: false },
  { id: 4, title: "Review", completed: false }
]

const completedSteps = steps.filter(step => step.completed).length
const progressValue = (completedSteps / steps.length) * 100

<div className="space-y-4">
  <div className="flex justify-between text-sm">
    <span>Step {completedSteps + 1} of {steps.length}</span>
    <span>{Math.round(progressValue)}% complete</span>
  </div>
  
  <Progress value={progressValue} indicatorVariant="success" />
  
  <div className="flex justify-between">
    {steps.map((step) => (
      <div 
        key={step.id}
        className={cn(
          "text-xs text-center",
          step.completed ? "text-green-600" : "text-muted-foreground"
        )}
      >
        {step.title}
      </div>
    ))}
  </div>
</div>
```

### File Upload Progress

```tsx
const [uploads, setUploads] = useState([
  { id: 1, name: "document.pdf", progress: 100, status: "complete" },
  { id: 2, name: "image.jpg", progress: 45, status: "uploading" },
  { id: 3, name: "video.mp4", progress: 0, status: "pending" }
])

<div className="space-y-4">
  {uploads.map((upload) => (
    <div key={upload.id} className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="truncate">{upload.name}</span>
        <span className="text-muted-foreground">
          {upload.status === "complete" ? "Complete" : 
           upload.status === "uploading" ? "Uploading..." : "Pending"}
        </span>
      </div>
      <Progress 
        value={upload.progress} 
        indicatorVariant={
          upload.status === "complete" ? "success" :
          upload.status === "uploading" ? "default" : "muted"
        }
        showValue
      />
    </div>
  ))}
</div>
```

### Skill Level Indicators

```tsx
const skills = [
  { name: "React", level: 90 },
  { name: "TypeScript", level: 85 },
  { name: "Node.js", level: 75 },
  { name: "Python", level: 60 },
  { name: "Go", level: 40 }
]

<div className="space-y-4">
  <h3 className="text-lg font-medium">Skills</h3>
  {skills.map((skill) => (
    <div key={skill.name} className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{skill.name}</span>
        <span className="text-muted-foreground">{skill.level}%</span>
      </div>
      <Progress 
        value={skill.level} 
        indicatorVariant={
          skill.level >= 80 ? "success" :
          skill.level >= 60 ? "default" :
          skill.level >= 40 ? "warning" : "destructive"
        }
      />
    </div>
  ))}
</div>
```

### Storage Usage

```tsx
const storageData = {
  used: 45.2,
  total: 100,
  breakdown: [
    { type: "Photos", used: 20.5, color: "bg-blue-500" },
    { type: "Videos", used: 15.3, color: "bg-green-500" },
    { type: "Documents", used: 7.8, color: "bg-yellow-500" },
    { type: "Other", used: 1.6, color: "bg-gray-500" }
  ]
}

const usagePercentage = (storageData.used / storageData.total) * 100

<div className="space-y-4">
  <div className="flex justify-between">
    <h3 className="text-lg font-medium">Storage Usage</h3>
    <span className="text-sm text-muted-foreground">
      {storageData.used}GB / {storageData.total}GB
    </span>
  </div>
  
  <Progress 
    value={usagePercentage} 
    indicatorVariant={usagePercentage > 90 ? "destructive" : 
                     usagePercentage > 75 ? "warning" : "default"}
    showValue
    formatValue={(value) => `${storageData.used}GB used`}
  />
  
  <div className="space-y-2">
    {storageData.breakdown.map((item) => (
      <div key={item.type} className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <div className={cn("w-3 h-3 rounded-full", item.color)} />
          <span>{item.type}</span>
        </div>
        <span className="text-muted-foreground">{item.used}GB</span>
      </div>
    ))}
  </div>
</div>
```

### Health/Score Indicators

```tsx
const healthMetrics = [
  { 
    name: "Security Score", 
    value: 95, 
    description: "Your account security is excellent",
    variant: "success" as const
  },
  { 
    name: "Performance", 
    value: 78, 
    description: "Good performance with room for improvement",
    variant: "default" as const
  },
  { 
    name: "SEO Score", 
    value: 65, 
    description: "Consider optimizing your content",
    variant: "warning" as const
  },
  { 
    name: "Accessibility", 
    value: 45, 
    description: "Needs significant improvement",
    variant: "destructive" as const
  }
]

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {healthMetrics.map((metric) => (
    <div key={metric.name} className="space-y-3 p-4 border rounded-lg">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">{metric.name}</h4>
        <span className="text-2xl font-bold">{metric.value}</span>
      </div>
      
      <Progress 
        value={metric.value} 
        indicatorVariant={metric.variant}
        size="lg"
      />
      
      <p className="text-sm text-muted-foreground">
        {metric.description}
      </p>
    </div>
  ))}
</div>
```

### Animated Progress

```tsx
const [progress, setProgress] = useState(0)

useEffect(() => {
  const interval = setInterval(() => {
    setProgress(prev => {
      if (prev >= 100) {
        return 0 // Reset for demo
      }
      return prev + 1
    })
  }, 100)
  
  return () => clearInterval(interval)
}, [])

<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span>Processing...</span>
    <span>{progress}%</span>
  </div>
  <Progress 
    value={progress} 
    className="transition-all duration-100"
    indicatorVariant="info"
  />
</div>
```

## Accessibility

### Features

- **ARIA Support**: Full ARIA progressbar implementation via Radix UI
- **Value Announcements**: Screen readers announce progress changes
- **Semantic Structure**: Proper progress element semantics
- **Descriptive Labels**: Support for aria-label and aria-describedby

### Best Practices

```tsx
// Provide descriptive labels
<div>
  <label id="upload-label">File Upload Progress</label>
  <Progress 
    value={progress}
    aria-labelledby="upload-label"
    aria-describedby="upload-description"
  />
  <p id="upload-description" className="text-sm text-muted-foreground">
    Uploading document.pdf - {progress}% complete
  </p>
</div>

// Announce completion
<Progress 
  value={progress}
  aria-label={`Upload ${progress}% complete`}
/>

// Use live regions for dynamic updates
<div aria-live="polite" aria-atomic="true">
  <Progress value={progress} showValue />
</div>
```

## Styling

### CSS Variables

The component uses the following CSS custom properties:

- `--primary`: Default indicator color
- `--destructive`: Error/destructive indicator color
- `--secondary`: Default background color
- `--muted`: Muted background variant
- `--input`: Border color for outline variant

### Customization

```tsx
// Custom colors
<Progress 
  value={60}
  className="bg-gray-200"
  style={{
    '--indicator-color': '#10b981'
  }}
/>

// Custom height
<Progress 
  value={75}
  className="h-8 rounded-lg"
/>

// Gradient indicator
<Progress 
  value={85}
  className="[&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-purple-500"
/>
```

## Performance

### Optimization Tips

1. **Throttle Updates**: Avoid too frequent progress updates
2. **Transition Control**: Use CSS transitions for smooth animations
3. **Memory Management**: Clear intervals and timeouts

```tsx
// Throttled progress updates
const [progress, setProgress] = useState(0)
const throttledSetProgress = useMemo(
  () => throttle(setProgress, 100),
  []
)

// Optimized progress tracking
useEffect(() => {
  const updateProgress = () => {
    // Calculate progress
    const newProgress = calculateProgress()
    throttledSetProgress(newProgress)
  }
  
  const interval = setInterval(updateProgress, 500)
  return () => clearInterval(interval)
}, [throttledSetProgress])
```

## Migration Guide

### From HTML Progress Element

```tsx
// Before: HTML progress
<progress value={32} max={100}>32%</progress>

// After: Progress component
<Progress value={32} showValue />
```

### From Custom Progress Bars

```tsx
// Before: Custom CSS progress
<div className="progress-container">
  <div 
    className="progress-bar" 
    style={{ width: `${progress}%` }}
  />
</div>

// After: Progress component
<Progress value={progress} />
```

## Related Components

- **Slider**: For input controls
- **Skeleton**: For loading states
- **Spinner**: For indeterminate loading
- **Badge**: For status indicators

## Testing

### Test Scenarios

```tsx
import { render, screen } from '@testing-library/react'
import { Progress } from '@/components/ui/progress'

// Basic rendering
test('renders progress with value', () => {
  render(<Progress value={50} />)
  const progress = screen.getByRole('progressbar')
  
  expect(progress).toHaveAttribute('aria-valuenow', '50')
  expect(progress).toHaveAttribute('aria-valuemax', '100')
})

// Value display
test('shows value when showValue is true', () => {
  render(<Progress value={75} showValue />)
  expect(screen.getByText('75%')).toBeInTheDocument()
})

// Custom formatting
test('uses custom value formatter', () => {
  render(
    <Progress 
      value={25} 
      showValue 
      formatValue={(value) => `${value}/100 items`}
    />
  )
  expect(screen.getByText('25/100 items')).toBeInTheDocument()
})

// Accessibility
test('has proper ARIA attributes', () => {
  render(
    <Progress 
      value={60} 
      aria-label="Loading progress"
    />
  )
  
  const progress = screen.getByRole('progressbar')
  expect(progress).toHaveAccessibleName('Loading progress')
})
```
