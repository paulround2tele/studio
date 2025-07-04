/**
 * Comprehensive Test Examples for MCP Browser Tool Cursor Features
 * 
 * This file demonstrates all the newly implemented cursor capabilities in the MCP browser tool.
 * These examples show how AI agents can use coordinate-based interactions for more precise
 * and flexible browser automation.
 */

// =============================================================================
// BASIC COORDINATE CLICKING EXAMPLES
// =============================================================================

/**
 * Example 1: Basic Coordinate Clicking with clickat
 * Click at specific viewport coordinates (450, 300)
 */
const basicCoordinateClick = {
  url: "http://localhost:3000/test-ui",
  actions: [
    {
      action: "clickat",
      x: 450,
      y: 300,
      coordSystem: "viewport",
      button: "left",
      clicks: 1,
      delay: 100
    }
  ]
};

/**
 * Example 2: Click at Page Coordinates (accounting for scroll)
 * Useful for clicking elements that might be scrolled out of view
 */
const pageCoordinateClick = {
  url: "http://localhost:3000/dashboard",
  actions: [
    {
      action: "clickat",
      x: 200,
      y: 800,  // Below viewport, requires page coordinates
      coordSystem: "page"
    }
  ]
};

/**
 * Example 3: Element-Relative Coordinate Click
 * Click 50px right and 25px down from the top-left of a specific element
 */
const elementRelativeClick = {
  url: "http://localhost:3000/campaigns",
  actions: [
    {
      action: "clickat",
      x: 50,
      y: 25,
      coordSystem: "element",
      relativeTo: ".campaign-card:first-child"
    }
  ]
};

// =============================================================================
// MOUSE MOVEMENT EXAMPLES
// =============================================================================

/**
 * Example 4: Mouse Movement with moveto
 * Move cursor to coordinates without clicking
 */
const mouseMovement = {
  url: "http://localhost:3000/login",
  actions: [
    {
      action: "moveto",
      x: 300,
      y: 200,
      coordSystem: "viewport"
    },
    // Wait to see cursor position
    {
      action: "wait",
      timeout: 1000
    },
    {
      action: "moveto",
      x: 500,
      y: 400,
      coordSystem: "viewport"
    }
  ]
};

/**
 * Example 5: Hover Interactions with hoverat
 * Hover over coordinates to trigger tooltip or dropdown
 */
const hoverInteraction = {
  url: "http://localhost:3000/dashboard",
  actions: [
    {
      action: "hoverat",
      x: 350,
      y: 150,
      coordSystem: "viewport"
    },
    // Wait for hover effect (tooltip, dropdown, etc.)
    {
      action: "wait",
      timeout: 1500
    }
  ]
};

// =============================================================================
// DRAG AND DROP OPERATIONS
// =============================================================================

/**
 * Example 6: Basic Drag and Drop with dragfrom
 * Drag from one coordinate to another
 */
const basicDragDrop = {
  url: "http://localhost:3000/canvas-editor",
  actions: [
    {
      action: "dragfrom",
      x: 200,
      y: 200,
      toX: 400,
      toY: 300,
      coordSystem: "viewport",
      delay: 500
    }
  ]
};

/**
 * Example 7: Complex Drag Operations for Drawing
 * Create a signature or drawing by dragging
 */
const drawingDragOperation = {
  url: "http://localhost:3000/signature-pad",
  actions: [
    // Draw a curve
    {
      action: "dragfrom",
      x: 100,
      y: 200,
      toX: 200,
      toY: 150,
      coordSystem: "element",
      relativeTo: "#signature-canvas"
    },
    // Continue the curve
    {
      action: "dragfrom",
      x: 200,
      y: 150,
      toX: 300,
      toY: 200,
      coordSystem: "element",
      relativeTo: "#signature-canvas"
    },
    // Finish with a flourish
    {
      action: "dragfrom",
      x: 300,
      y: 200,
      toX: 350,
      toY: 180,
      coordSystem: "element",
      relativeTo: "#signature-canvas"
    }
  ]
};

/**
 * Example 8: File Drag and Drop Simulation
 * Simulate dragging a file from one area to another
 */
const fileDragDrop = {
  url: "http://localhost:3000/file-manager",
  actions: [
    // Select file by clicking
    {
      action: "clickat",
      x: 150,
      y: 250,
      coordSystem: "element",
      relativeTo: ".file-list"
    },
    // Drag to upload area
    {
      action: "dragfrom",
      x: 150,
      y: 250,
      toX: 500,
      toY: 100,
      coordSystem: "viewport"
    }
  ]
};

// =============================================================================
// RIGHT-CLICK AND CONTEXT MENUS
// =============================================================================

/**
 * Example 9: Right-Click Context Menus with rightclickat
 * Right-click to open context menu at specific coordinates
 */
const rightClickContextMenu = {
  url: "http://localhost:3000/text-editor",
  actions: [
    {
      action: "rightclickat",
      x: 300,
      y: 200,
      coordSystem: "viewport",
      delay: 200
    },
    // Wait for context menu to appear
    {
      action: "wait",
      timeout: 500
    },
    // Click on context menu item
    {
      action: "clickat",
      x: 320,
      y: 230,
      coordSystem: "viewport"
    }
  ]
};

/**
 * Example 10: Right-Click on Canvas Elements
 * Right-click on specific canvas or drawing elements
 */
const canvasRightClick = {
  url: "http://localhost:3000/diagram-editor",
  actions: [
    {
      action: "rightclickat",
      x: 250,
      y: 180,
      coordSystem: "element",
      relativeTo: "#diagram-canvas"
    },
    // Select "Delete" from context menu
    {
      action: "clickat",
      x: 270,
      y: 220,
      coordSystem: "viewport"
    }
  ]
};

// =============================================================================
// DOUBLE-CLICK ACTIONS
// =============================================================================

/**
 * Example 11: Double-Click Actions with doubleclickat
 * Double-click to select text or trigger special actions
 */
const doubleClickSelection = {
  url: "http://localhost:3000/document-editor",
  actions: [
    {
      action: "doubleclickat",
      x: 400,
      y: 250,
      coordSystem: "viewport",
      delay: 100
    }
  ]
};

/**
 * Example 12: Double-Click to Edit Elements
 * Double-click on editable elements to enter edit mode
 */
const doubleClickEdit = {
  url: "http://localhost:3000/forms",
  actions: [
    {
      action: "doubleclickat",
      x: 200,
      y: 150,
      coordSystem: "element",
      relativeTo: ".editable-label"
    },
    // Type new text after double-click
    {
      action: "type",
      text: "Updated Label Text"
    }
  ]
};

// =============================================================================
// PRECISE SCROLLING OPERATIONS
// =============================================================================

/**
 * Example 13: Precise Scrolling with scrollat
 * Scroll at specific coordinates with precise control
 */
const preciseScrolling = {
  url: "http://localhost:3000/long-content",
  actions: [
    {
      action: "scrollat",
      x: 400,
      y: 300,
      scrollY: -200,  // Scroll up 200 pixels
      coordSystem: "viewport"
    },
    {
      action: "wait",
      timeout: 500
    },
    {
      action: "scrollat",
      x: 400,
      y: 300,
      scrollY: 400,   // Scroll down 400 pixels
      coordSystem: "viewport"
    }
  ]
};

/**
 * Example 14: Horizontal Scrolling
 * Scroll horizontally in a scrollable container
 */
const horizontalScrolling = {
  url: "http://localhost:3000/horizontal-gallery",
  actions: [
    {
      action: "scrollat",
      x: 500,
      y: 300,
      scrollX: 300,   // Scroll right 300 pixels
      coordSystem: "element",
      relativeTo: ".gallery-container"
    }
  ]
};

/**
 * Example 15: Scroll Wheel Delta Scrolling
 * Use scroll wheel delta for more natural scrolling
 */
const wheelScrolling = {
  url: "http://localhost:3000/feed",
  actions: [
    {
      action: "scrollat",
      x: 400,
      y: 400,
      scrollDelta: 5,  // 5 wheel ticks down
      coordSystem: "viewport"
    }
  ]
};

// =============================================================================
// MIXED COORDINATE AND SELECTOR WORKFLOWS
// =============================================================================

/**
 * Example 16: Combined Coordinate and Selector Actions
 * Mix coordinate-based and selector-based actions for flexibility
 */
const mixedWorkflow = {
  url: "http://localhost:3000/complex-form",
  actions: [
    // Use selector to find and fill input
    {
      action: "click",
      selector: "#username"
    },
    {
      action: "type",
      text: "test@example.com"
    },
    // Use coordinates for custom elements
    {
      action: "clickat",
      x: 350,
      y: 200,
      coordSystem: "viewport"
    },
    // Back to selector for standard form element
    {
      action: "click",
      selector: "#submit-button"
    }
  ]
};

/**
 * Example 17: Coordinate-Based Form Filling
 * Fill forms using only coordinates (useful for custom/complex forms)
 */
const coordinateFormFilling = {
  url: "http://localhost:3000/custom-form",
  actions: [
    // Click first input field
    {
      action: "clickat",
      x: 300,
      y: 150,
      coordSystem: "viewport"
    },
    {
      action: "type",
      text: "John Doe"
    },
    // Click second input field
    {
      action: "clickat",
      x: 300,
      y: 200,
      coordSystem: "viewport"
    },
    {
      action: "type",
      text: "john@example.com"
    },
    // Click submit button
    {
      action: "clickat",
      x: 350,
      y: 300,
      coordSystem: "viewport"
    }
  ]
};

// =============================================================================
// COMPLEX MULTI-STEP GESTURES
// =============================================================================

/**
 * Example 18: Complex Drawing Gestures
 * Create complex drawings with multiple coordinate actions
 */
const complexDrawingGesture = {
  url: "http://localhost:3000/drawing-app",
  actions: [
    // Draw a rectangle
    {
      action: "dragfrom",
      x: 100,
      y: 100,
      toX: 100,
      toY: 200,
      coordSystem: "element",
      relativeTo: "#canvas"
    },
    {
      action: "dragfrom",
      x: 100,
      y: 200,
      toX: 200,
      toY: 200,
      coordSystem: "element",
      relativeTo: "#canvas"
    },
    {
      action: "dragfrom",
      x: 200,
      y: 200,
      toX: 200,
      toY: 100,
      coordSystem: "element",
      relativeTo: "#canvas"
    },
    {
      action: "dragfrom",
      x: 200,
      y: 100,
      toX: 100,
      toY: 100,
      coordSystem: "element",
      relativeTo: "#canvas"
    },
    // Draw diagonal line through rectangle
    {
      action: "dragfrom",
      x: 100,
      y: 100,
      toX: 200,
      toY: 200,
      coordSystem: "element",
      relativeTo: "#canvas"
    }
  ]
};

/**
 * Example 19: Multi-Panel Interface Navigation
 * Navigate complex multi-panel interfaces using coordinates
 */
const multiPanelNavigation = {
  url: "http://localhost:3000/dashboard",
  actions: [
    // Click on left panel item
    {
      action: "clickat",
      x: 100,
      y: 200,
      coordSystem: "viewport"
    },
    // Click on center panel content
    {
      action: "clickat",
      x: 400,
      y: 250,
      coordSystem: "viewport"
    },
    // Drag to resize panel
    {
      action: "dragfrom",
      x: 250,
      y: 400,
      toX: 300,
      toY: 400,
      coordSystem: "viewport"
    },
    // Click on right panel tool
    {
      action: "clickat",
      x: 700,
      y: 150,
      coordSystem: "viewport"
    }
  ]
};

// =============================================================================
// GAME TESTING EXAMPLES
// =============================================================================

/**
 * Example 20: Game Interface Testing
 * Test game interfaces with precise coordinate control
 */
const gameInterfaceTesting = {
  url: "http://localhost:3000/puzzle-game",
  actions: [
    // Click on game piece
    {
      action: "clickat",
      x: 300,
      y: 200,
      coordSystem: "element",
      relativeTo: "#game-board"
    },
    // Drag piece to new position
    {
      action: "dragfrom",
      x: 300,
      y: 200,
      toX: 350,
      toY: 250,
      coordSystem: "element",
      relativeTo: "#game-board"
    },
    // Right-click for options
    {
      action: "rightclickat",
      x: 350,
      y: 250,
      coordSystem: "element",
      relativeTo: "#game-board"
    }
  ]
};

/**
 * Example 21: Interactive Map Testing
 * Test interactive maps and geographic interfaces
 */
const mapInteractionTesting = {
  url: "http://localhost:3000/map-view",
  actions: [
    // Click on map location
    {
      action: "clickat",
      x: 400,
      y: 300,
      coordSystem: "element",
      relativeTo: "#map-container"
    },
    // Drag to pan map
    {
      action: "dragfrom",
      x: 400,
      y: 300,
      toX: 350,
      toY: 250,
      coordSystem: "element",
      relativeTo: "#map-container"
    },
    // Scroll to zoom
    {
      action: "scrollat",
      x: 400,
      y: 300,
      scrollDelta: 3,
      coordSystem: "element",
      relativeTo: "#map-container"
    }
  ]
};

// =============================================================================
// CREATIVE WORKFLOW EXAMPLES
// =============================================================================

/**
 * Example 22: Digital Art Creation
 * Create digital art using coordinate-based brush strokes
 */
const digitalArtCreation = {
  url: "http://localhost:3000/art-studio",
  actions: [
    // Select brush tool (coordinate-based)
    {
      action: "clickat",
      x: 50,
      y: 100,
      coordSystem: "viewport"
    },
    // Paint stroke 1
    {
      action: "dragfrom",
      x: 200,
      y: 150,
      toX: 300,
      toY: 180,
      coordSystem: "element",
      relativeTo: "#art-canvas"
    },
    // Paint stroke 2
    {
      action: "dragfrom",
      x: 250,
      y: 200,
      toX: 320,
      toY: 220,
      coordSystem: "element",
      relativeTo: "#art-canvas"
    },
    // Select different tool
    {
      action: "clickat",
      x: 50,
      y: 150,
      coordSystem: "viewport"
    },
    // Create different stroke
    {
      action: "dragfrom",
      x: 180,
      y: 250,
      toX: 280,
      toY: 280,
      coordSystem: "element",
      relativeTo: "#art-canvas"
    }
  ]
};

/**
 * Example 23: Video Timeline Editing
 * Edit video timelines with precise coordinate control
 */
const videoTimelineEditing = {
  url: "http://localhost:3000/video-editor",
  actions: [
    // Click on timeline at specific time
    {
      action: "clickat",
      x: 400,
      y: 300,
      coordSystem: "element",
      relativeTo: "#timeline"
    },
    // Drag to select range
    {
      action: "dragfrom",
      x: 400,
      y: 300,
      toX: 500,
      toY: 300,
      coordSystem: "element",
      relativeTo: "#timeline"
    },
    // Right-click for context menu
    {
      action: "rightclickat",
      x: 450,
      y: 300,
      coordSystem: "element",
      relativeTo: "#timeline"
    },
    // Select cut operation
    {
      action: "clickat",
      x: 470,
      y: 330,
      coordSystem: "viewport"
    }
  ]
};

// =============================================================================
// ERROR HANDLING AND VALIDATION EXAMPLES
// =============================================================================

/**
 * Example 24: Error Handling - Invalid Coordinates
 * Test error handling for invalid coordinate inputs
 */
const errorHandlingInvalidCoords = {
  url: "http://localhost:3000/test-page",
  actions: [
    {
      action: "clickat",
      x: -50,  // Invalid negative coordinate
      y: 200,
      coordSystem: "viewport"
    }
  ]
};

/**
 * Example 25: Error Handling - Missing Element Reference
 * Test error handling when element reference is missing
 */
const errorHandlingMissingElement = {
  url: "http://localhost:3000/test-page",
  actions: [
    {
      action: "clickat",
      x: 100,
      y: 100,
      coordSystem: "element",
      relativeTo: "#non-existent-element"  // Element doesn't exist
    }
  ]
};

/**
 * Example 26: Error Handling - Coordinates Out of Bounds
 * Test error handling for coordinates outside viewport
 */
const errorHandlingOutOfBounds = {
  url: "http://localhost:3000/test-page",
  actions: [
    {
      action: "clickat",
      x: 2000,  // Beyond typical viewport width
      y: 2000,  // Beyond typical viewport height
      coordSystem: "viewport"
    }
  ]
};

// =============================================================================
// COMPREHENSIVE WORKFLOW EXAMPLE
// =============================================================================

/**
 * Example 27: Complete Application Workflow
 * Comprehensive example combining multiple cursor features
 */
const comprehensiveWorkflow = {
  url: "http://localhost:3000/app",
  actions: [
    // Navigate to login using coordinates
    {
      action: "clickat",
      x: 700,
      y: 50,
      coordSystem: "viewport"
    },
    // Fill login form with coordinates
    {
      action: "clickat",
      x: 300,
      y: 200,
      coordSystem: "viewport"
    },
    {
      action: "type",
      text: "user@example.com"
    },
    {
      action: "clickat",
      x: 300,
      y: 250,
      coordSystem: "viewport"
    },
    {
      action: "type",
      text: "password123"
    },
    {
      action: "clickat",
      x: 300,
      y: 300,
      coordSystem: "viewport"
    },
    // Navigate dashboard
    {
      action: "moveto",
      x: 400,
      y: 200,
      coordSystem: "viewport"
    },
    {
      action: "hoverat",
      x: 400,
      y: 200,
      coordSystem: "viewport"
    },
    {
      action: "wait",
      timeout: 1000
    },
    {
      action: "clickat",
      x: 400,
      y: 200,
      coordSystem: "viewport"
    },
    // Create new item with drag and drop
    {
      action: "dragfrom",
      x: 100,
      y: 150,
      toX: 400,
      toY: 300,
      coordSystem: "viewport"
    },
    // Configure item with right-click
    {
      action: "rightclickat",
      x: 400,
      y: 300,
      coordSystem: "viewport"
    },
    {
      action: "clickat",
      x: 420,
      y: 330,
      coordSystem: "viewport"
    },
    // Scroll to see more options
    {
      action: "scrollat",
      x: 400,
      y: 400,
      scrollY: 200,
      coordSystem: "viewport"
    },
    // Double-click to edit
    {
      action: "doubleclickat",
      x: 350,
      y: 450,
      coordSystem: "viewport"
    },
    {
      action: "type",
      text: "Updated configuration"
    }
  ]
};

// =============================================================================
// EXPORT ALL EXAMPLES
// =============================================================================

module.exports = {
  // Basic coordinate operations
  basicCoordinateClick,
  pageCoordinateClick,
  elementRelativeClick,
  
  // Mouse movement
  mouseMovement,
  hoverInteraction,
  
  // Drag and drop
  basicDragDrop,
  drawingDragOperation,
  fileDragDrop,
  
  // Right-click operations
  rightClickContextMenu,
  canvasRightClick,
  
  // Double-click operations
  doubleClickSelection,
  doubleClickEdit,
  
  // Scrolling operations
  preciseScrolling,
  horizontalScrolling,
  wheelScrolling,
  
  // Mixed workflows
  mixedWorkflow,
  coordinateFormFilling,
  
  // Complex gestures
  complexDrawingGesture,
  multiPanelNavigation,
  
  // Game testing
  gameInterfaceTesting,
  mapInteractionTesting,
  
  // Creative workflows
  digitalArtCreation,
  videoTimelineEditing,
  
  // Error handling
  errorHandlingInvalidCoords,
  errorHandlingMissingElement,
  errorHandlingOutOfBounds,
  
  // Comprehensive example
  comprehensiveWorkflow
};

/**
 * Usage Instructions:
 * 
 * To use these examples with the MCP browser tool, call the 
 * generate_ui_test_prompt_with_actions tool with any of these objects:
 * 
 * {
 *   "server_name": "studio-backend-context",
 *   "tool_name": "generate_ui_test_prompt_with_actions",
 *   "arguments": basicCoordinateClick
 * }
 * 
 * Each example demonstrates different aspects of the cursor features:
 * - Coordinate systems (viewport, element, page)
 * - Mouse actions (click, move, hover, drag)
 * - Mouse buttons (left, right, middle)
 * - Scrolling operations
 * - Complex multi-step interactions
 * - Error handling scenarios
 */