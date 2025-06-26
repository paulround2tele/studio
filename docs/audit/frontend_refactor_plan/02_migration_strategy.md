# Migration Strategy & Component Inventory

**Date:** 2025-06-26

**Objective:** To create a detailed component inventory and formulate a phased migration strategy for transitioning the DomainFlow codebase to a new, modern design system.

---

## 1. Component Inventory

The following is a comprehensive inventory of the components found in the `src/components/ui` and `src/components/shared` directories.

### 1.1. Atomic UI Components (`src/components/ui`)

These components are the foundational, reusable building blocks of the application's UI. They are largely based on `shadcn/ui` and Radix UI primitives.

| Component Name      | File Path                  | Category      | Description                                                                 |
| ------------------- | -------------------------- | ------------- | --------------------------------------------------------------------------- |
| **Input & Controls**|                            |               |                                                                             |
| `Button`            | `button.tsx`               | Atom          | The primary button component for actions.                                   |
| `Checkbox`          | `checkbox.tsx`             | Atom          | A control that allows the user to select one or more options.               |
| `RadioGroup`        | `radio-group.tsx`          | Atom          | A set of checkable buttons, where only one can be selected at a time.       |
| `Switch`            | `switch.tsx`               | Atom          | A control that allows the user to toggle between two states.                |
| `Slider`            | `slider.tsx`               | Atom          | A control that allows the user to select a value from a range.              |
| `Input`             | `input.tsx`                | Atom          | A standard text input field.                                                |
| `BigIntInput`       | `BigIntInput.tsx`          | Atom          | A custom input for handling large integer values.                           |
| `Textarea`          | `textarea.tsx`             | Atom          | A multi-line text input field.                                              |
| `Select`            | `select.tsx`               | Molecule      | A control for selecting a value from a list of options.                     |
| `Calendar`          | `calendar.tsx`             | Molecule      | A component for selecting dates.                                            |
| `Form`              | `form.tsx`                 | Organism      | A collection of components for building forms with validation.              |
| `FormFieldError`    | `form-field-error.tsx`     | Atom          | A component to display form field validation errors.                        |
| **Display & Layout**|                            |               |                                                                             |
| `Accordion`         | `accordion.tsx`            | Molecule      | A vertically stacked set of interactive headings that each reveal a section.|
| `Card`              | `card.tsx`                 | Molecule      | A container for grouping related content.                                   |
| `Table`             | `table.tsx`                | Organism      | A component for displaying tabular data.                                    |
| `Avatar`            | `avatar.tsx`               | Atom          | A component to display a user's avatar or initials.                         |
| `Badge`             | `badge.tsx`                | Atom          | A small component for displaying status or counts.                          |
| `Progress`          | `progress.tsx`             | Atom          | A component to display the progress of a task.                              |
| `Separator`         | `separator.tsx`            | Atom          | A visual separator between elements.                                        |
| `Skeleton`          | `skeleton.tsx`             | Atom          | A placeholder component to indicate loading content.                        |
| `BigIntDisplay`     | `BigIntDisplay.tsx`        | Atom          | A custom component for displaying large integer values.                     |
| `ScrollArea`        | `scroll-area.tsx`          | Molecule      | A container with a customized scrollbar.                                    |
| **Overlays & Modals**|                           |               |                                                                             |
| `AlertDialog`       | `alert-dialog.tsx`         | Molecule      | A modal dialog that interrupts the user's workflow to communicate something.|
| `Dialog`            | `dialog.tsx`               | Molecule      | A window overlaid on either the primary window or another dialog window.    |
| `Popover`           | `popover.tsx`              | Molecule      | A pop-up that displays information related to an element.                   |
| `Tooltip`           | `tooltip.tsx`              | Molecule      | A pop-up that displays information on hover.                                |
| `Toast`             | `toast.tsx`                | Atom          | A succinct message that is displayed temporarily.                           |
| `Toaster`           | `toaster.tsx`              | Organism      | The container that renders all toasts.                                      |
| `Sheet`             | `sheet.tsx`                | Molecule      | A slide-out panel for displaying content.                                   |
| **Navigation**      |                            |               |                                                                             |
| `Menubar`           | `menubar.tsx`              | Organism      | A horizontal menu bar.                                                      |
| `DropdownMenu`      | `dropdown-menu.tsx`        | Molecule      | A menu that appears upon user interaction with a button or other control.   |
| `Tabs`              | `tabs.tsx`                 | Molecule      | A set of layered sections of content, known as tab panels.                  |
| `Sidebar`           | `sidebar.tsx`              | Organism      | The main application sidebar for navigation.                                |
| **System**          |                            |               |                                                                             |
| `GlobalLoading`     | `global-loading.tsx`       | Atom          | A global loading indicator for the application.                             |
| `Chart`             | `chart.tsx`                | Organism      | A wrapper around the Recharts library for consistent charting.              |

### 1.2. Shared Composite Components (`src/components/shared`)

These components are composed of multiple atomic components and are reused across different features.

| Component Name | File Path        | Category | Description                                         |
| -------------- | ---------------- | -------- | --------------------------------------------------- |
| `PageHeader`   | `PageHeader.tsx` | Organism | A consistent header for pages, likely including a title and actions. |

---

## 2. Migration Strategy

The goal of this migration is to transition to a new, unified design system while minimizing disruption to ongoing development. The strategy is divided into three main phases:

### Phase 1: Foundation & Tooling (Current Phase)

1.  **Design System Alignment:**
    *   Work with the design team to get the finalized Figma library for the new design system.
    *   Establish a clear mapping between the old components (inventoried above) and the new components.

2.  **Setup Storybook:**
    *   Integrate Storybook into the project to create an isolated environment for developing and documenting the new component library. This will be crucial for visual regression testing.

3.  **Theme & Token Configuration:**
    *   Configure the new theme (colors, typography, spacing, etc.) in `tailwind.config.ts` according to the new design system specifications.

### Phase 2: Component Migration (Iterative)

This phase will be an iterative process, migrating components one by one or in logical groups.

1.  **Prioritization:**
    *   **Atoms First:** Begin with the most foundational atomic components (e.g., `Button`, `Input`, `Card`). This ensures that the building blocks are solid before moving to more complex components.
    *   **Shared Components:** Next, migrate the shared `Organism`-level components like `PageHeader`.
    *   **Feature-Level Components:** Finally, work through each feature directory (`campaigns`, `dashboard`, etc.), replacing old components with their new counterparts.

2.  **Migration Workflow (per component):**
    *   Create a new Storybook story for the component to visualize it in isolation.
    *   Create a new component file (e.g., `NewButton.tsx`) to avoid breaking existing implementations.
    *   Build the new component according to the new design system, using the new theme tokens.
    *   Use visual regression testing (e.g., with Chromatic or Percy) to compare the new component against the design specs.
    *   Once the new component is approved, systematically replace the old component's usage across the codebase. A global find-and-replace will be possible for many components.

### Phase 3: New Development & Deprecation

1.  **New Feature Development:**
    *   All new features must be built exclusively with the new component library. No new instances of old components should be introduced.

2.  **Deprecation:**
    *   Once a component has been fully migrated, its old file will be deprecated and eventually removed.
    *   A codemod script can be written to automate the renaming of imports for many components.

## 3. Proposed Timeline & Next Steps

*   **Next Step:** Begin Phase 1 by setting up Storybook and aligning with the design team on the new Figma library.
*   **Timeline:** A detailed timeline will be created once the scope of the new design system is fully understood.

This phased approach will allow for a controlled and predictable migration, ensuring that the application remains stable and that new features can be developed in parallel.