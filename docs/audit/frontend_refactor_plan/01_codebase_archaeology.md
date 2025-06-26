# Codebase Archaeology Report

**Date:** 2025-06-26

**Objective:** To analyze the existing frontend codebase to identify the current technology stack, UI dependencies, styling methodologies, and component structure as the first step in a comprehensive technical audit and migration strategy.

---

## 1. Core Frontend Stack

The application is built on a modern, robust, and widely-used technology stack.

*   **Framework:** **Next.js** (`^15.3.3`)
    *   The project utilizes the Next.js framework, as evidenced by the `next` dependency in [`package.json`](package.json:56) and the usage of `next` commands (`dev`, `build`, `start`) in the `scripts` section.
*   **Language:** **TypeScript** (`^5.8.3`)
    *   The presence of `typescript` and numerous `@types/*` packages in `devDependencies` confirms that the codebase is written in TypeScript, ensuring type safety and improved developer experience.

## 2. UI & Styling Dependencies

The project leverages a modern, utility-first styling architecture based on a combination of popular and powerful libraries.

*   **Core Styling Engine:** **Tailwind CSS** (`^3.4.1`)
    *   The primary styling methodology is Tailwind CSS, configured via [`tailwind.config.ts`](tailwind.config.ts:1) and [`postcss.config.js`](postcss.config.js:1).
*   **UI Component Toolkit:** **Shadcn/UI** (Inferred)
    *   While not a direct dependency, the combination of the following libraries is the signature of a `shadcn/ui` implementation:
        *   **Radix UI:** A comprehensive set of unstyled, accessible UI primitives (e.g., [`@radix-ui/react-dialog`](package.json:33), [`@radix-ui/react-select`](package.json:41)).
        *   **Styling Utilities:** [`class-variance-authority`](package.json:52), [`clsx`](package.json:53), and [`tailwind-merge`](package.json:62) are used for creating and managing dynamic and conditional classes.
*   **Icon Library:** **Lucide React** (`^0.514.0`)
    *   Used for rendering a consistent and customizable set of SVG icons.
*   **Data Visualization:** **Recharts** (`^2.15.1`)
    *   A composable charting library used for creating visualizations.

## 3. State Management Dependencies

The application employs a dual-strategy for state management, separating client-side UI state from server-side cache state.

*   **Client-Side State:** **Zustand** (`^5.0.5`)
    *   A lightweight, unopinionated state management library used for managing global UI state.
*   **Server-Side State (Data Fetching):** **TanStack React Query** (`^5.66.0`)
    *   Used for fetching, caching, synchronizing, and updating server state.

## 4. Identified Styling Methodologies

The codebase demonstrates a highly consistent and modern approach to styling.

*   **Primary Methodology:** **Utility-First CSS (Tailwind CSS)**
    *   Styling is applied directly in the markup via utility classes.
*   **Competing Methodologies:** **None**
    *   Searches for `.css`, `.scss`, and `.sass` files within the `src/` directory yielded no results. This indicates a clean implementation without legacy or competing styling systems like global stylesheets, CSS Modules, or CSS-in-JS libraries.

## 5. High-Level Component Structure

The component architecture is well-organized, separating concerns by feature and architectural role. The main component directory is [`src/components/`](src/components/).

*   **Feature-Specific Components:**
    *   `auth/`, `campaigns/`, `dashboard/`, `personas/`, `proxies/`
    *   These directories contain components that are specific to a particular feature or domain of the application.
*   **Architectural & Shared Components:**
    *   **`ui/`**: Contains the core, reusable UI components, consistent with a `shadcn/ui` structure (e.g., `Button.tsx`, `Card.tsx`).
    *   **`shared/`**: For complex components that are reused across multiple features but are not considered atomic UI primitives.
    *   **`layout/`**: Holds components responsible for the overall page structure (e.g., `Header`, `Sidebar`, `Footer`).
    *   **`providers/`**: Contains React Context providers for managing global concerns like theme, session, or query client.
    *   **`system/`**: Likely for components related to system-level functionality, such as error boundaries or notification managers.