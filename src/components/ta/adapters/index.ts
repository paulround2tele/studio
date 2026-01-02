/**
 * TailAdmin Adapters - Thin translation layers from shadcn-style APIs to TailAdmin visuals.
 * 
 * These adapters provide a single source of truth for migrating shadcn UI components
 * to TailAdmin without modifying TailAdmin core files.
 * 
 * Each adapter:
 * - Preserves existing aria attributes
 * - Supports react-hook-form controlled usage
 * - Maintains visual parity with TailAdmin
 * - Does NOT modify business logic
 */

export { default as InputAdapter } from "./InputAdapter";
export type { InputAdapterProps } from "./InputAdapter";

export { default as TextAreaAdapter } from "./TextAreaAdapter";
export type { TextAreaAdapterProps } from "./TextAreaAdapter";

export { default as SelectAdapter } from "./SelectAdapter";
export type { SelectAdapterProps, SelectOption } from "./SelectAdapter";

export { default as DialogAdapter } from "./DialogAdapter";
export type { DialogAdapterProps } from "./DialogAdapter";

export { default as TooltipAdapter } from "./TooltipAdapter";
export type { TooltipAdapterProps } from "./TooltipAdapter";

export { default as TabsAdapter } from "./TabsAdapter";
export type { TabsAdapterProps, TabItem } from "./TabsAdapter";

export { default as SwitchAdapter } from "./SwitchAdapter";
export type { SwitchAdapterProps } from "./SwitchAdapter";

export { default as RangeAdapter } from "./RangeAdapter";
export type { RangeAdapterProps } from "./RangeAdapter";
