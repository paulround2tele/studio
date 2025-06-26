# Component Inventory & Migration Plan

**Objective:** This document provides a comprehensive inventory of all UI components in the `src/components` directory. It serves as a guide for the migration to the new design system, outlining each component's purpose, classification, dependencies, and estimated migration complexity.

---

## 1. UI Primitives (Atoms)

**Location:** `src/components/ui`

These components are the foundational building blocks of the user interface. They are based on `shadcn/ui` and act as styled wrappers around Radix UI primitives.

**Migration Strategy:** These components already align with the target architecture. The primary task will be to verify their implementation against the new design system's specifications and ensure consistency. No significant refactoring is expected.

| Component File        | Purpose                               | Dependencies                               | Migration Complexity |
| --------------------- | ------------------------------------- | ------------------------------------------ | -------------------- |
| `accordion.tsx`       | A vertically stacked set of interactive headings that each reveal a section of content. | `react`, `@radix-ui/react-accordion`, `lucide-react`, `@/lib/utils` | Low                  |
| `alert-dialog.tsx`    | A modal dialog that interrupts the user and requires an action. | `react`, `@radix-ui/react-alert-dialog`, `@/lib/utils`, `@/components/ui/button` | Low                  |
| `alert.tsx`           | Displays a callout for user attention. | `react`, `class-variance-authority`, `@/lib/utils` | Low                  |
| `avatar.tsx`          | An image element with a fallback for representing a user. | `react`, `@radix-ui/react-avatar`, `@/lib/utils` | Low                  |
| `badge.tsx`           | Displays a small amount of information. | `react`, `class-variance-authority`, `@/lib/utils` | Low                  |
| `BigIntDisplay.tsx`   | Renders a `bigint` value with various formatting options. | `react`, `@/lib/types/branded`, `@/lib/utils` | Low                  |
| `BigIntInput.tsx`     | An input field for `bigint` values with validation. | `react`, `@/lib/types/branded`, `@/components/ui/input`, `@/lib/utils` | Low                  |
| `button.tsx`          | A clickable button element. | `react`, `@radix-ui/react-slot`, `class-variance-authority`, `lucide-react`, `@/lib/utils` | Low                  |
| `calendar.tsx`        | A calendar component for date selection. | `react`, `lucide-react`, `react-day-picker`, `@/lib/utils`, `@/components/ui/button` | Low                  |
| `card.tsx`            | A container for grouping related content. | `react`, `@/lib/utils` | Low                  |
| `chart.tsx`           | A wrapper for `recharts` to create data visualizations. | `react`, `recharts`, `@/lib/utils` | Medium               |
| `checkbox.tsx`        | A checkbox input element. | `react`, `@radix-ui/react-checkbox`, `lucide-react`, `@/lib/utils` | Low                  |
| `dialog.tsx`          | A window overlaid on either the primary window or another dialog window. | `react`, `@radix-ui/react-dialog`, `lucide-react`, `@/lib/utils` | Low                  |
| `dropdown-menu.tsx`   | Displays a menu to the user — such as a set of actions or functions — triggered by a button. | `react`, `@radix-ui/react-dropdown-menu`, `lucide-react`, `@/lib/utils` | Low                  |
| `form-field-error.tsx`| Displays field-specific validation errors. | `react`, `lucide-react`, `@/lib/utils` | Low                  |
| `form.tsx`            | A wrapper for `react-hook-form` to create forms. | `react`, `@radix-ui/react-label`, `@radix-ui/react-slot`, `react-hook-form`, `@/lib/utils`, `@/components/ui/label` | Low                  |
| `global-loading.tsx`  | A global loading indicator. | `react`, `@/lib/stores/loadingStore`, `@/lib/utils` | Low                  |
| `input.tsx`           | A standard text input field. | `react`, `@/lib/utils` | Low                  |
| `label.tsx`           | Renders an accessible label associated with a form control. | `react`, `@radix-ui/react-label`, `class-variance-authority`, `@/lib/utils` | Low                  |
| `menubar.tsx`         | A visually persistent menu bar. | `react`, `@radix-ui/react-menubar`, `lucide-react`, `@/lib/utils` | Low                  |
| `popover.tsx`         | Displays rich content in a portal, triggered by a button. | `react`, `@radix-ui/react-popover`, `@/lib/utils` | Low                  |
| `progress.tsx`        | Displays an indicator showing the completion progress of a task. | `react`, `@radix-ui/react-progress`, `@/lib/utils` | Low                  |
| `radio-group.tsx`     | A set of checkable buttons—known as radio buttons—where no more than one of the buttons can be checked at a time. | `react`, `@radix-ui/react-radio-group`, `lucide-react`, `@/lib/utils` | Low                  |
| `scroll-area.tsx`     | Augments native scroll functionality for custom, cross-browser styling. | `react`, `@radix-ui/react-scroll-area`, `@/lib/utils` | Low                  |
| `select.tsx`          | Displays a list of options for the user to pick from—triggered by a button. | `react`, `@radix-ui/react-select`, `lucide-react`, `@/lib/utils` | Low                  |
| `separator.tsx`       | A visual separator. | `react`, `@radix-ui/react-separator`, `@/lib/utils` | Low                  |
| `sheet.tsx`           | A slide-in panel for displaying content. | `react`, `@radix-ui/react-dialog`, `class-variance-authority`, `lucide-react`, `@/lib/utils` | Low                  |
| `sidebar.tsx`         | A sidebar component with collapsible and responsive behavior. | `react`, `@radix-ui/react-slot`, `class-variance-authority`, `lucide-react`, `@/hooks/use-mobile`, `@/lib/utils`, `@/components/ui/button`, `@/components/ui/input`, `@/components/ui/separator`, `@/components/ui/sheet`, `@/components/ui/skeleton`, `@/components/ui/tooltip` | Medium               |
| `skeleton.tsx`        | A placeholder for content that is loading. | `react`, `@/lib/utils` | Low                  |
| `slider.tsx`          | A control that allows users to select a value from a range. | `react`, `@radix-ui/react-slider`, `@/lib/utils` | Low                  |
---

## 2. Shared Components (Molecules)

**Location:** `src/components/shared`

These components are composed of multiple UI Primitives and are designed for reuse across different features. They encapsulate a specific piece of UI functionality.

**Migration Strategy:** These components will need to be reviewed to ensure they correctly consume the updated UI Primitives. The primary effort will be in verifying props and styling.

| Component File      | Purpose                                      | Dependencies              | Migration Complexity |
| ------------------- | -------------------------------------------- | ------------------------- | -------------------- |
| `PageHeader.tsx`    | A consistent header for pages, including a title, description, icon, and action buttons. | `react`, `lucide-react`   | Low                  |
---

## 3. Layout Components (Organisms/Templates)

**Location:** `src/components/layout`

These components define the primary structure and chrome of the application. They are responsible for arranging the main UI areas.

**Migration Strategy:** These components are critical to the user experience. The main effort will be to ensure they correctly integrate with the updated `ui` and `shared` components and that the overall layout remains consistent and responsive.

| Component File          | Purpose                               | Dependencies                               | Migration Complexity |
| ----------------------- | ------------------------------------- | ------------------------------------------ | -------------------- |
| `AppLayout.tsx`         | The main application shell, including the sidebar, header, and main content area. | `react`, `next/navigation`, `next/link`, `lucide-react`, `@/contexts/AuthContext`, `@/contexts/WebSocketStatusContext`, `@/components/ui/sidebar`, `@/lib/hooks/useMemoryMonitoring`, `@/lib/services/websocketService.simple` | Medium               |
| `ConditionalLayout.tsx` | A wrapper that conditionally applies the `AppLayout` based on the current route (e.g., excluding it for login/signup pages). | `react`, `next/navigation`, `./AppLayout` | Low                  |
---

## 4. Authentication Components (Organisms &amp; Templates)

**Location:** `src/components/auth`

These components handle all aspects of user authentication, authorization, and profile management. They are critical for application security and user experience.

**Migration Strategy:** These components have significant business logic and state management. The migration will involve carefully replacing UI elements with the new primitives, ensuring that all form handling, validation, and state updates continue to function correctly. The complexity is high due to the security-sensitive nature of these components.

| Component File             | Purpose                               | Dependencies                               | Migration Complexity |
| -------------------------- | ------------------------------------- | ------------------------------------------ | -------------------- |
| `LoginForm.tsx`            | A full-featured login form with validation, error handling, and security features like rate limiting. | `react`, `next/navigation`, `next/link`, `lucide-react`, `zod`, `@/contexts/AuthContext`, `@/components/ui/*`, `@/lib/utils/errorHandling`, `@/lib/stores/loadingStore` | High                 |
| `ProtectedRoute.tsx`       | A higher-order component and hook for protecting routes based on user authentication, roles, and permissions. | `react`, `next/navigation`, `lucide-react`, `@/contexts/AuthContext`, `@/components/ui/button`, `@/components/ui/card`, `@/components/ui/alert` | High                 |
| `SecurityAuditLog.tsx`     | An admin-facing component for viewing security events and audit trails. | `react`, `lucide-react`, `@/contexts/AuthContext`, `@/components/ui/*`, `@/lib/types` | High                 |
| `StrictProtectedRoute.tsx` | A more stringent version of `ProtectedRoute` that enforces complete isolation and immediate redirection for unauthorized access. | `react`, `next/navigation`, `lucide-react`, `@/contexts/AuthContext`, `@/components/ui/button`, `@/components/ui/card` | High                 |
| `UserManagement.tsx`       | A comprehensive UI for administrators to perform CRUD operations on users. | `react`, `lucide-react`, `zod`, `@/contexts/AuthContext`, `@/components/ui/*`, `@/lib/types` | High                 |
| `UserProfile.tsx`          | A component for users to view their profile information and change their password. | `react`, `lucide-react`, `zod`, `@/contexts/AuthContext`, `@/components/ui/*`, `@/lib/types` | High                 |
| `WithPermission.tsx`       | A wrapper component to conditionally render UI elements based on user permissions or roles. | `react`, `@/contexts/AuthContext` | Medium               |
---

## 5. Campaign Components (Organisms &amp; Templates)

**Location:** `src/components/campaigns`

These components are responsible for creating, managing, and monitoring campaigns. This is a core feature of the application with significant complexity.

**Migration Strategy:** This is the most critical and complex area for migration. Each component must be carefully refactored to use the new UI primitives while ensuring that all business logic, state management, and API integrations remain intact. The forms are particularly complex and will require significant attention to detail.

| Component File                        | Purpose                               | Dependencies                               | Migration Complexity |
| ------------------------------------- | ------------------------------------- | ------------------------------------------ | -------------------- |
| `CampaignFormV2.tsx`                  | A comprehensive form for creating and editing campaigns, with dynamic fields based on campaign type. | `react`, `next/navigation`, `zod`, `react-hook-form`, `lucide-react`, `@/components/ui/*`, `@/components/shared/PageHeader`, `@/hooks/use-toast`, `@/lib/constants`, `@/lib/types`, `@/lib/services/campaignService.production`, `@/lib/schemas/unifiedCampaignSchema`, `@/lib/schemas/campaignFormSchema`, `@/lib/utils/errorHandling`, `@/lib/hooks/useDomainCalculation`, `@/lib/hooks/useCampaignFormData`, `./form/*` | High                 |
| `CampaignListItem.tsx`                | A card-based component for displaying a summary of a single campaign in a list. | `react`, `next/link`, `lucide-react`, `@/components/ui/*`, `@/lib/types`, `@/lib/constants` | Medium               |
| `CampaignProgress.tsx`                | A visual representation of the campaign's progress through its various phases. | `react`, `lucide-react`, `@/components/ui/progress`, `@/components/ui/tooltip`, `@/lib/types`, `@/lib/constants`, `@/lib/utils` | Medium               |
| `CampaignProgressMonitor.tsx`         | A real-time monitor for campaign progress, using WebSockets to receive live updates. | `react`, `lucide-react`, `@/components/ui/card`, `@/components/ui/badge`, `@/components/ui/progress`, `@/hooks/use-toast`, `@/contexts/AuthContext`, `@/lib/services/websocketService.simple`, `@/lib/types`, `@/lib/utils/statusMapping`, `@/lib/utils/websocketMessageAdapter` | High                 |
| `CampaignStats.tsx`                   | Displays key statistics for a campaign, such as progress, success rate, and item counts. | `react`, `lucide-react`, `@/components/ui/card`, `@/components/ui/BigIntDisplay`, `@/components/ui/progress`, `@/lib/types`, `@/lib/utils` | Medium               |
| `ContentSimilarityView.tsx`           | A view for analyzing content similarity and generated leads. | `react`, `lucide-react`, `@/components/ui/*`, `@/lib/types`, `@/lib/services/campaignService.production`, `@/hooks/use-toast` | High                 |
| `DomainSourceSelectionDialog.tsx`     | A dialog for selecting the source of domains for a campaign. (File is empty) | `N/A` | Low                  |
| `PhaseGateButton.tsx`                 | A button for triggering phase transitions in a campaign. | `react`, `lucide-react`, `@/components/ui/button` | Low                  |
| `form/CampaignTuningConfig.tsx`       | A form section for tuning campaign performance parameters. | `react`, `react-hook-form`, `@/components/ui/*`, `@/lib/schemas/campaignFormSchema` | Medium               |
| `form/DomainGenerationConfig.tsx`     | A form section for configuring domain generation parameters. | `react`, `react-hook-form`, `@/components/ui/*`, `@/lib/schemas/campaignFormSchema` | Medium               |
| `form/DomainSourceConfig.tsx`         | A form section for configuring the source of domains for a campaign. | `react`, `react-hook-form`, `@/components/ui/*`, `@/lib/schemas/campaignFormSchema`, `@/lib/types` | Medium               |
| `form/KeywordConfig.tsx`              | A form section for configuring keywords for HTTP validation. | `react`, `react-hook-form`, `@/components/ui/*`, `@/lib/schemas/campaignFormSchema` | Medium               |
| `form/OperationalAssignments.tsx`     | A form section for assigning personas and proxies to a campaign. | `react`, `react-hook-form`, `lucide-react`, `@/components/ui/*`, `@/lib/schemas/campaignFormSchema`, `@/lib/types` | Medium               |
---

## 6. Feature Components (Organisms &amp; Templates)

**Location:** `src/components/{dashboard,personas,proxies,proxyPools}`

These components provide the core features of the application. They are often complex and stateful, with significant business logic.

**Migration Strategy:** Similar to the campaign components, these require careful refactoring. The focus will be on replacing the UI elements while preserving the underlying logic and state management.

| Component File                      | Purpose                               | Dependencies                               | Migration Complexity |
| ----------------------------------- | ------------------------------------- | ------------------------------------------ | -------------------- |
| `dashboard/LatestActivityTable.tsx` | A table displaying the latest domain activity across all campaigns. | `react`, `next/link`, `lucide-react`, `@/components/ui/*`, `@/lib/types`, `@/lib/constants`, `@/lib/services/campaignService.production`, `@/lib/utils/campaignTransforms`, `@/lib/stores/loadingStore` | High                 |
| `personas/PersonaForm.tsx`          | A form for creating and editing HTTP and DNS personas. | `react`, `next/navigation`, `zod`, `react-hook-form`, `lucide-react`, `@/components/ui/*`, `@/hooks/use-toast`, `@/contexts/AuthContext`, `@/lib/services/personaService`, `@/lib/types`, `@/lib/schemas/brandedValidationSchemas` | High                 |
| `personas/PersonaListItem.tsx`      | A card-based component for displaying a single persona. | `react`, `next/link`, `lucide-react`, `date-fns`, `@/components/ui/*`, `@/lib/types`, `@/hooks/use-toast`, `@/lib/utils` | Medium               |
| `proxies/BulkOperations.tsx`        | A component for performing bulk operations on proxies (e.g., enable, disable, test, delete). | `react`, `lucide-react`, `@/components/ui/*`, `@/lib/types`, `@/lib/services/proxyService.production`, `@/hooks/use-toast` | High                 |
| `proxies/ProxyForm.tsx`             | A form for creating and editing proxies. | `react`, `zod`, `react-hook-form`, `lucide-react`, `@/components/ui/*`, `@/lib/types`, `@/lib/services/proxyService.production`, `@/hooks/use-toast`, `@/contexts/AuthContext`, `@/lib/schemas/brandedValidationSchemas` | High                 |
| `proxies/ProxyListItem.tsx`         | A table row component for displaying a single proxy. | `react`, `lucide-react`, `date-fns`, `@/components/ui/*`, `@/lib/types`, `@/lib/utils` | Medium               |
| `proxies/ProxyTesting.tsx`          | A component for testing proxies and viewing health metrics. | `react`, `lucide-react`, `@/components/ui/*`, `@/lib/types`, `@/lib/services/proxyService.production`, `@/hooks/use-toast`, `@/lib/hooks/useProxyHealth`, `@/lib/types/branded` | High                 |
| `proxyPools/ProxyPoolForm.tsx`      | A form for creating and editing proxy pools. | `react`, `zod`, `react-hook-form`, `lucide-react`, `@/components/ui/*`, `@/lib/types/proxyPoolTypes`, `@/lib/services/proxyPoolService.production`, `@/hooks/use-toast` | High                 |
| `proxyPools/ProxyPoolList.tsx`      | A component for listing and managing proxy pools. | `react`, `lucide-react`, `@/components/ui/*`, `./ProxyPoolForm`, `@/lib/services/proxyPoolService.production`, `@/lib/types/proxyPoolTypes`, `@/hooks/use-toast` | High                 |

---

## 7. System &amp; Utility Components

**Location:** `src/components/{error,examples,monitoring,providers,system,websocket}`

These components provide system-level functionality, such as error handling, monitoring, and WebSocket status updates.

**Migration Strategy:** These components are generally not UI-heavy, but their integration with the rest of the application is critical. The migration will focus on ensuring they continue to function correctly after the UI components are updated.

| Component File                         | Purpose                               | Dependencies                               | Migration Complexity |
| -------------------------------------- | ------------------------------------- | ------------------------------------------ | -------------------- |
| `error/ApiErrorBoundary.tsx`           | An error boundary for handling API-related errors. | `react`, `lucide-react`, `@/components/ui/alert`, `@/components/ui/button`, `@/components/ui/card`, `@/components/ui/badge` | Low                  |
| `error/GlobalErrorBoundary.tsx`        | A global error boundary for catching and displaying application-wide errors. | `react`, `lucide-react`, `@/components/ui/card`, `@/components/ui/button`, `@/components/ui/alert`, `@/hooks/use-toast` | Low                  |
| `error/NetworkErrorHandler.tsx`        | A component for handling network and authentication errors. | `react`, `lucide-react`, `@/components/ui/alert`, `@/components/ui/button`, `@/components/ui/card`, `@/hooks/use-toast` | Low                  |
| `examples/SimpleCampaignProgress.tsx`  | An example component demonstrating WebSocket usage. | `react`, `@/lib/hooks/useWebSocket`, `@/components/websocket/WebSocketStatus.simple`, `@/lib/services/websocketService.simple` | Low                  |
| `monitoring/MetricsDashboard.tsx`      | A dashboard for displaying real-time performance and error metrics. | `react`, `recharts`, `lucide-react`, `@/components/ui/*`, `@/lib/monitoring/performance-monitor`, `@/lib/monitoring/error-tracker`, `@/lib/monitoring/alerting` | High                 |
| `providers/MonitoringProvider.tsx`     | A provider for initializing and managing the application's monitoring services. | `react`, `@/lib/monitoring/performance-monitor`, `@/lib/monitoring/monitoring-service`, `@/lib/monitoring/monitoring-config` | Low                  |
| `system/ProductionReadinessCheck.tsx`  | A component for checking the production readiness of the application. | `react`, `lucide-react`, `@/components/ui/*`, `@/contexts/AuthContext`, `@/lib/services/websocketService.simple`, `@/lib/utils` | Medium               |
| `websocket/WebSocketStatus.simple.tsx` | A simple component for displaying WebSocket connection status. | `react`, `@/lib/hooks/useWebSocket` | Low                  |