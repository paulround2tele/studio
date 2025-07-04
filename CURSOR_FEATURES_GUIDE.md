# Cursor Features Guide for MCP Browser Tool

This guide provides comprehensive documentation for the newly implemented cursor features in the MCP browser tool. These features enable AI agents to perform precise, coordinate-based browser interactions beyond traditional selector-based automation.

## Table of Contents

1. [Overview](#overview)
2. [New Action Types](#new-action-types)
3. [Coordinate Systems](#coordinate-systems)
4. [API Reference](#api-reference)
5. [Best Practices](#best-practices)
6. [Common Use Cases](#common-use-cases)
7. [Error Handling](#error-handling)
8. [Migration Guide](#migration-guide)
9. [Examples](#examples)
10. [Troubleshooting](#troubleshooting)

## Overview

The MCP browser tool has been enhanced with powerful coordinate-based interaction capabilities. These new cursor features allow AI agents to:

- Perform precise pixel-level interactions
- Work with custom UI components that lack standard selectors
- Execute complex gestures and drawing operations
- Interact with canvas elements, games, and creative applications
- Handle dynamic or generated interfaces more effectively

### Key Benefits

- **Precision**: Exact coordinate control for pixel-perfect interactions
- **Flexibility**: Works with any visual element, regardless of HTML structure
- **Compatibility**: Maintains backward compatibility with existing selector-based actions
- **Versatility**: Supports complex workflows like drawing, dragging, and multi-step gestures

## New Action Types

### Primary Coordinate Actions

| Action | Description | Required Parameters | Optional Parameters |
|--------|-------------|-------------------|-------------------|
| `moveto` | Move cursor to coordinates | `x`, `y` | `coordSystem`, `relativeTo`, `delay` |
| `clickat` | Click at specific coordinates | `x`, `y` | `button`, `clicks`, `delay`, `coordSystem`, `relativeTo` |
| `doubleclickat` | Double-click at coordinates | `x`, `y` | `button`, `delay`, `coordSystem`, `relativeTo` |
| `rightclickat` | Right-click at coordinates | `x`, `y` | `delay`, `coordSystem`, `relativeTo` |
| `dragfrom` | Drag from one point to another | `x`, `y`, `toX`, `toY` | `coordSystem`, `relativeTo`, `delay` |
| `hoverat` | Hover at specific coordinates | `x`, `y` | `coordSystem`, `relativeTo` |
| `scrollat` | Scroll at specific coordinates | `x`, `y` | `scrollX`, `scrollY`, `scrollDelta`, `coordSystem`, `relativeTo` |

### Enhanced Traditional Actions

The traditional `click`, `hover`, and `scroll` actions have been enhanced to support coordinate parameters alongside selectors, providing hybrid functionality.

## Coordinate Systems

### Viewport Coordinates (`coordSystem: "viewport"`)

**Default system.** Coordinates relative to the visible browser window.

```javascript
{
  action: "clickat",
  x: 400,
  y: 300,
  coordSystem: "viewport"  // Optional - this is the default
}
```

- Origin (0,0) is top-left of viewport
- X increases rightward, Y increases downward
- Coordinates must be within viewport bounds
- Best for: Standard UI interactions, toolbar buttons, navigation

### Element-Relative Coordinates (`coordSystem: "element"`)

Coordinates relative to a specific element's bounding box.

```javascript
{
  action: "clickat",
  x: 50,
  y: 25,
  coordSystem: "element",
  relativeTo: "#canvas-element"
}
```

- Origin (0,0) is top-left of the specified element
- Requires `relativeTo` parameter with CSS selector
- Automatically calculates absolute position
- Best for: Canvas interactions, custom components, relative positioning

### Page Coordinates (`coordSystem: "page"`)

Coordinates relative to the entire page, accounting for scroll position.

```javascript
{
  action: "clickat",
  x: 200,
  y: 1500,  // May be below current viewport
  coordSystem: "page"
}
```

- Origin (0,0) is top-left of the entire page
- Accounts for current scroll position
- Useful for elements that may be scrolled out of view
- Best for: Long pages, scrollable content, absolute positioning

## API Reference

### UIAction Schema

The enhanced `UIAction` model supports both traditional and coordinate-based parameters:

```typescript
interface UIAction {
  // Required
  action: string;
  
  // Traditional selector-based (backward compatible)
  selector?: string;
  text?: string;
  url?: string;
  timeout?: number;
  
  // Coordinate-based parameters
  x?: number;
  y?: number;
  toX?: number;      // For drag operations
  toY?: number;      // For drag operations
  
  // Mouse configuration
  button?: "left" | "right" | "middle";
  clicks?: number;   // Number of clicks (default: 1)
  delay?: number;    // Delay in milliseconds
  
  // Coordinate system
  coordSystem?: "viewport" | "element" | "page";
  relativeTo?: string;  // CSS selector for element coordinate system
  
  // Gesture support
  points?: Point[];     // Array of points for complex gestures
  pressure?: number;    // Pressure level (0-1)
  smooth?: boolean;     // Smooth gesture movements
  
  // Scroll configuration
  scrollX?: number;     // Horizontal scroll pixels
  scrollY?: number;     // Vertical scroll pixels
  scrollDelta?: number; // Scroll wheel delta
}
```

### Point Interface

For complex gesture support:

```typescript
interface Point {
  x: number;
  y: number;
  delay?: number;      // Delay before this point (ms)
  pressure?: number;   // Touch pressure (0-1)
}
```

### Validation Rules

The system validates coordinate actions according to these rules:

1. **Required Coordinates**: `moveto`, `clickat`, `doubleclickat`, `rightclickat`, `hoverat`, `scrollat` require `x` and `y`
2. **Drag Coordinates**: `dragfrom` requires `x`, `y`, `toX`, and `toY`
3. **Scroll Parameters**: `scrollat` requires at least one of `scrollX`, `scrollY`, or `scrollDelta`
4. **Element System**: `coordSystem: "element"` requires `relativeTo` selector
5. **Boundary Validation**: Viewport coordinates must be within window bounds
6. **Gesture Points**: `gesture` actions require at least 2 points

## Best Practices

### 1. Choose the Right Coordinate System

```javascript
// ✅ Use viewport for standard UI elements
{ action: "clickat", x: 100, y: 50, coordSystem: "viewport" }

// ✅ Use element for canvas/custom components  
{ action: "clickat", x: 50, y: 25, coordSystem: "element", relativeTo: "#canvas" }

// ✅ Use page for elements that might be scrolled
{ action: "clickat", x: 200, y: 1500, coordSystem: "page" }
```

### 2. Combine with Traditional Actions

```javascript
// ✅ Mix coordinate and selector actions effectively
const actions = [
  { action: "click", selector: "#login-button" },        // Use selectors for standard elements
  { action: "clickat", x: 300, y: 200 },                // Use coordinates for custom elements
  { action: "type", text: "Hello World" }               // Continue with traditional actions
];
```

### 3. Handle Delays Appropriately

```javascript
// ✅ Add delays for visual feedback and animations
{
  action: "clickat",
  x: 400, y: 300,
  delay: 200  // Allow for click animation
}
```

### 4. Validate Element Existence

```javascript
// ✅ Ensure target elements exist for element-relative coordinates
{
  action: "clickat",
  x: 50, y: 50,
  coordSystem: "element",
  relativeTo: "#canvas"  // Make sure this element exists
}
```

### 5. Use Appropriate Mouse Buttons

```javascript
// ✅ Specify mouse buttons explicitly for clarity
{ action: "clickat", x: 300, y: 200, button: "left" }     // Standard click
{ action: "rightclickat", x: 300, y: 200 }                // Context menu
{ action: "clickat", x: 300, y: 200, button: "middle" }   // Middle click for new tabs
```

## Common Use Cases

### 1. Canvas and Drawing Applications

```javascript
// Drawing a simple shape on canvas
const drawingActions = [
  {
    action: "dragfrom",
    x: 100, y: 100,
    toX: 200, toY: 200,
    coordSystem: "element",
    relativeTo: "#drawing-canvas"
  }
];
```

### 2. Complex Form Interactions

```javascript
// Filling a custom form with coordinate precision
const formActions = [
  { action: "clickat", x: 300, y: 150 },  // Custom input field
  { action: "type", text: "John Doe" },
  { action: "clickat", x: 300, y: 200 },  // Another custom field
  { action: "type", text: "john@example.com" }
];
```

### 3. Game Testing

```javascript
// Testing a puzzle game interface
const gameActions = [
  {
    action: "dragfrom",
    x: 100, y: 100,
    toX: 200, toY: 200,
    coordSystem: "element",
    relativeTo: "#game-board"
  },
  {
    action: "rightclickat",
    x: 200, y: 200,
    coordSystem: "element",
    relativeTo: "#game-board"
  }
];
```

### 4. Creative Workflows

```javascript
// Digital art creation workflow
const artActions = [
  { action: "clickat", x: 50, y: 100 },   // Select brush tool
  {
    action: "dragfrom",                    // Paint stroke
    x: 200, y: 150,
    toX: 300, toY: 180,
    coordSystem: "element",
    relativeTo: "#art-canvas"
  }
];
```

### 5. Multi-Panel Interfaces

```javascript
// Navigating complex dashboard interfaces
const dashboardActions = [
  { action: "clickat", x: 100, y: 200 },  // Left panel
  { action: "clickat", x: 400, y: 250 },  // Center content
  {
    action: "dragfrom",                    // Resize panel
    x: 250, y: 400,
    toX: 300, toY: 400
  }
];
```

## Error Handling

### Common Error Scenarios

#### 1. Invalid Coordinates

```javascript
// ❌ Negative coordinates
{ action: "clickat", x: -50, y: 200 }

// ❌ Coordinates outside viewport
{ action: "clickat", x: 2000, y: 2000 }
```

**Error Response:**
```
"coordinates cannot be negative: x=-50, y=200"
"coordinates exceed viewport bounds: x=2000, y=2000 (viewport: 1200x800)"
```

#### 2. Missing Required Parameters

```javascript
// ❌ Missing Y coordinate
{ action: "clickat", x: 100 }

// ❌ Missing target coordinates for drag
{ action: "dragfrom", x: 100, y: 100 }
```

**Error Response:**
```
"action 'clickat' requires X and Y coordinates"
"action 'dragfrom' requires X, Y, ToX, and ToY coordinates"
```

#### 3. Invalid Element Reference

```javascript
// ❌ Element doesn't exist
{
  action: "clickat",
  x: 100, y: 100,
  coordSystem: "element",
  relativeTo: "#non-existent-element"
}
```

**Error Response:**
```
"element not found with selector: #non-existent-element"
```

#### 4. Invalid Coordinate System

```javascript
// ❌ Unknown coordinate system
{ action: "clickat", x: 100, y: 100, coordSystem: "invalid" }
```

**Error Response:**
```
"invalid coordinate system: invalid"
```

### Error Recovery Strategies

1. **Coordinate Validation**: Always validate coordinates are within expected bounds
2. **Element Existence**: Check element existence before using element-relative coordinates
3. **Fallback Actions**: Provide alternative selector-based actions when coordinates fail
4. **Graceful Degradation**: Use traditional selectors as backup for critical interactions

## Migration Guide

### From Selector-Based to Coordinate-Based Actions

#### Step 1: Identify Suitable Actions

Good candidates for coordinate-based actions:
- Custom UI components without standard selectors
- Canvas and drawing interactions
- Complex drag-and-drop operations
- Game interfaces
- Creative applications

#### Step 2: Determine Coordinate System

```javascript
// Before: Selector-based
{ action: "click", selector: "#custom-button" }

// After: Coordinate-based
{ action: "clickat", x: 300, y: 200, coordSystem: "viewport" }
```

#### Step 3: Add Error Handling

```javascript
// Robust approach with fallback
const robustClick = {
  primary: { action: "clickat", x: 300, y: 200 },
  fallback: { action: "click", selector: "#backup-selector" }
};
```

#### Step 4: Test Thoroughly

- Test across different viewport sizes
- Verify coordinate accuracy
- Validate error handling
- Ensure backward compatibility

### Backward Compatibility

All existing selector-based actions continue to work unchanged:

```javascript
// ✅ These continue to work exactly as before
{ action: "click", selector: "#button" }
{ action: "type", text: "Hello", selector: "#input" }
{ action: "hover", selector: ".menu-item" }
```

## Examples

### Basic Coordinate Operations

```javascript
// Simple click at viewport coordinates
{
  action: "clickat",
  x: 400,
  y: 300
}

// Right-click with delay
{
  action: "rightclickat",
  x: 300,
  y: 200,
  delay: 200
}

// Double-click for text selection
{
  action: "doubleclickat",
  x: 250,
  y: 150
}
```

### Drag and Drop Operations

```javascript
// Basic drag operation
{
  action: "dragfrom",
  x: 200, y: 200,
  toX: 400, toY: 300
}

// Canvas drawing stroke
{
  action: "dragfrom",
  x: 100, y: 100,
  toX: 200, toY: 150,
  coordSystem: "element",
  relativeTo: "#canvas"
}
```

### Scrolling Operations

```javascript
// Scroll down at coordinates
{
  action: "scrollat",
  x: 400, y: 300,
  scrollY: 200
}

// Horizontal scroll in container
{
  action: "scrollat",
  x: 500, y: 300,
  scrollX: 150,
  coordSystem: "element",
  relativeTo: ".scrollable-container"
}
```

### Complex Workflows

```javascript
// Multi-step creative workflow
const creativeWorkflow = [
  // Select tool
  { action: "clickat", x: 50, y: 100 },
  
  // Create shape
  {
    action: "dragfrom",
    x: 200, y: 200,
    toX: 300, toY: 300,
    coordSystem: "element",
    relativeTo: "#canvas"
  },
  
  // Right-click for options
  {
    action: "rightclickat",
    x: 250, y: 250,
    coordSystem: "element",
    relativeTo: "#canvas"
  },
  
  // Select option from context menu
  { action: "clickat", x: 270, y: 280 }
];
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: Coordinates Not Working as Expected

**Symptoms**: Clicks happening in wrong locations

**Solutions**:
1. Check coordinate system - viewport vs element vs page
2. Verify element existence for element-relative coordinates
3. Account for scroll position when using page coordinates
4. Ensure viewport size is as expected

#### Issue: Element Not Found for Relative Coordinates

**Symptoms**: "element not found" errors

**Solutions**:
1. Wait for element to load before coordinate action
2. Use `waitForSelector` before coordinate actions
3. Verify CSS selector is correct
4. Check if element is hidden or not yet rendered

#### Issue: Coordinates Outside Viewport

**Symptoms**: "coordinates exceed viewport bounds" errors

**Solutions**:
1. Use page coordinates for elements outside viewport
2. Scroll to bring element into view first
3. Adjust coordinates to fit within viewport
4. Use element-relative coordinates for better scaling

#### Issue: Inconsistent Behavior Across Browsers

**Symptoms**: Actions work in one browser but not another

**Solutions**:
1. Test coordinate calculations across browsers
2. Use element-relative coordinates for better consistency
3. Add browser-specific coordinate adjustments
4. Verify viewport size consistency

### Debugging Tips

1. **Log Coordinates**: Add logging to verify calculated coordinates
2. **Visual Debugging**: Use browser dev tools to inspect element positions
3. **Step-by-Step Testing**: Test each coordinate action individually
4. **Viewport Inspection**: Verify viewport size and scroll position
5. **Element Inspection**: Confirm element bounding boxes for relative coordinates

### Performance Considerations

1. **Coordinate Calculation**: Element-relative coordinates require DOM queries
2. **Validation Overhead**: Coordinate validation adds small performance cost
3. **Browser Responsiveness**: Allow time for UI updates between actions
4. **Memory Usage**: Complex gesture paths may use more memory

## AI Agent Integration

### GitHub Copilot Usage

```javascript
// AI agents can use these features for:
// 1. Automated testing of visual interfaces
// 2. Creative content generation
// 3. Game testing and interaction
// 4. Complex form automation
// 5. Canvas-based application testing

const aiWorkflow = {
  url: "http://localhost:3000/creative-app",
  actions: [
    // AI can precisely control creative tools
    { action: "clickat", x: 75, y: 125 },        // Select brush
    { action: "dragfrom", x: 200, y: 200, toX: 300, toY: 250 }, // Create stroke
    { action: "rightclickat", x: 250, y: 225 },  // Access options
    { action: "clickat", x: 275, y: 255 }        // Apply effect
  ]
};
```

### Best Practices for AI Agents

1. **Coordinate Validation**: Always validate coordinates before use
2. **Error Recovery**: Implement fallback strategies for failed coordinate actions
3. **Adaptive Sizing**: Account for different viewport sizes and resolutions
4. **Context Awareness**: Use appropriate coordinate systems based on interface type
5. **Human-Like Timing**: Add realistic delays between actions

---

## Conclusion

The new cursor features significantly expand the capabilities of the MCP browser tool, enabling precise, coordinate-based interactions that were previously impossible. By combining these features with traditional selector-based actions, AI agents can handle virtually any web interface, from standard forms to complex creative applications.

For questions, issues, or feature requests, please refer to the project documentation or contact the development team.