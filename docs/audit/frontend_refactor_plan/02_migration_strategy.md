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

## 4. Migration Best Practices & Operational Guidelines

### 4.1. Testing Coverage Strategy

**Objective:** Ensure robust testing coverage for all migrated components to prevent regressions and edge cases.

*   **Jest Unit Tests:** Require comprehensive unit tests for each migrated component, focusing on:
    *   Props validation and default values
    *   Event handlers and user interactions
    *   Accessibility compliance (ARIA attributes, keyboard navigation)
    *   Error states and edge cases
*   **Regression Testing:** Implement visual regression tests using tools like Chromatic or Percy to catch unintended UI changes
*   **Form Component Priority:** Pay special attention to form elements (inputs, selects, checkboxes) with thorough validation testing
*   **Overlay Elements:** Extensive testing for modals, tooltips, and popovers across different screen sizes and interaction patterns
*   **Coverage Threshold:** Maintain minimum 90% test coverage for migrated components

### 4.2. Migration Communication Plan

**Objective:** Ensure all developers are aligned on migration standards and processes to prevent inconsistencies.

*   **Kickoff Documentation:** Create a concise internal migration guide covering:
    *   Migration phases and timeline
    *   New component usage guidelines
    *   Code review checklist for migrations
    *   Common migration patterns and examples
*   **Team Sessions:** Conduct brief team sessions (30-45 minutes) to:
    *   Demo new component patterns
    *   Address migration questions
    *   Review ongoing progress and blockers
*   **PR Guidelines:** Establish clear pull request guidelines to prevent drift:
    *   Require migration checklist completion
    *   Mandatory design/QA review for UI changes
    *   No mixing of migration and feature work in single PRs

### 4.3. Documentation & Storybook Standards

**Objective:** Maintain comprehensive component documentation to accelerate adoption and reduce support overhead.

*   **Storybook Requirements:** For each migrated component, enforce:
    *   **Clear Stories:** Primary, secondary, and edge case variants
    *   **Usage Notes:** When to use vs. when to avoid, accessibility considerations
    *   **Props Tables:** Complete documentation of all props, types, and defaults
    *   **Interactive Controls:** Knobs for testing different prop combinations
*   **Documentation Review:** Include Storybook documentation as part of component review process
*   **Examples Repository:** Maintain real-world usage examples for complex components
*   **Onboarding Materials:** Create quick-start guides for developers new to the component system

### 4.4. Feature Freeze Strategy

**Objective:** Minimize risk during critical component migrations by temporarily limiting UI changes.

*   **High-Risk Migration Identification:** Identify components that require feature freeze:
    *   Core atoms (Button, Input, Select) used extensively across the app
    *   Major shared organisms (Navigation, Header, Layout components)
    *   Form components critical to user workflows
*   **Freeze Implementation:** During high-risk migrations:
    *   Coordinate with product team on timing
    *   Communicate freeze period to all stakeholders
    *   Create exception process for critical bug fixes
    *   Limit freeze duration to 2-3 days maximum
*   **Deployment Coordination:** Align migration deployments with regular release cycles when possible

### 4.5. Migration Tracking System

**Objective:** Maintain clear visibility of migration progress and prevent component islands.

*   **Tracking Table Structure:**
    | Component | Status | Assignee | Phase | Blockers | QA Status | Design Review |
    |-----------|--------|----------|-------|----------|-----------|---------------|
    | Button | Complete | Dev A | Phase 1 | None | ✅ Passed | ✅ Approved |
    | Input | In Progress | Dev B | Phase 1 | API Changes | ⏳ Pending | ✅ Approved |
    | Modal | Not Started | - | Phase 2 | Design Updates | - | ⏳ Pending |

*   **Status Categories:**
    *   **Not Started:** Component identified but work not begun
    *   **In Progress:** Active development/migration
    *   **QA Review:** Component complete, undergoing testing
    *   **Design Review:** Awaiting design team approval
    *   **Complete:** Fully migrated and deployed
    *   **Blocked:** Waiting on external dependencies

*   **Regular Updates:** Update tracking weekly during active migration phases
*   **Reporting:** Generate weekly progress reports for stakeholders

### 4.6. Design/QA Sync Schedule

**Objective:** Ensure continuous alignment with design and quality standards throughout migration.

*   **Regular Review Cadence:**
    *   **Weekly Check-ins:** 30-minute sessions during active migration phases
    *   **Phase Gate Reviews:** Comprehensive review at end of each major phase
    *   **Ad-hoc Reviews:** As-needed sessions for complex components or blockers

*   **Review Agenda Template:**
    1. **Progress Update:** Components completed, in-progress, and upcoming
    2. **Fidelity Validation:** Compare migrated components to design specs
    3. **Accessibility Review:** Ensure compliance with WCAG guidelines
    4. **User Experience Validation:** Test key user flows with migrated components
    5. **Blocker Resolution:** Address any design or QA concerns
    6. **Next Sprint Planning:** Prioritize upcoming components

*   **Review Participants:**
    *   **Required:** Lead Developer, Design Lead, QA Lead
    *   **Optional:** Product Manager, Frontend Developers working on migration

*   **Documentation:** Maintain review notes and decisions in shared space (Confluence/Notion)

## 5. Risk Mitigation Strategies

### 5.1. Rollback Plan
*   Maintain feature flags for major component swaps
*   Keep old components available until migration is fully validated
*   Implement gradual rollout strategy for high-traffic components

### 5.2. Performance Monitoring
*   Track bundle size impact of new components
*   Monitor runtime performance during migration phases
*   Set up alerts for performance regression detection

### 5.3. User Impact Minimization
*   Schedule major migrations during low-traffic periods
*   Implement A/B testing for user-facing component changes
*   Maintain feedback channels for user-reported issues