"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
    format?: (value: any) => string
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

// Chart container variants
const chartContainerVariants = cva(
  "flex justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
  {
    variants: {
      variant: {
        default: "",
        card: "rounded-lg border bg-card p-4",
        elevated: "rounded-lg bg-card shadow-lg p-4",
        minimal: "bg-transparent",
        outlined: "rounded-lg border-2 p-4",
      },
      size: {
        default: "aspect-video",
        sm: "h-48",
        lg: "h-80",
        xl: "h-96",
        square: "aspect-square",
        auto: "h-auto",
      },
      responsive: {
        true: "",
        false: "overflow-hidden",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      responsive: true,
    },
  }
)

// Chart tooltip variants
const chartTooltipVariants = cva(
  "grid min-w-[8rem] items-start gap-1.5 rounded-lg border shadow-xl",
  {
    variants: {
      variant: {
        default: "border-border/50 bg-background",
        dark: "bg-gray-900 text-white border-gray-700",
        light: "bg-white text-gray-900 border-gray-200",
        accent: "bg-primary text-primary-foreground border-primary",
      },
      size: {
        sm: "px-2 py-1 text-xs",
        default: "px-3 py-1.5 text-xs",
        lg: "px-4 py-2 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Chart legend variants
const chartLegendVariants = cva(
  "flex items-center gap-4",
  {
    variants: {
      variant: {
        horizontal: "flex-row",
        vertical: "flex-col",
        grid: "grid grid-cols-2 gap-2",
      },
      position: {
        top: "mb-4",
        bottom: "mt-4",
        left: "mr-4",
        right: "ml-4",
      },
      size: {
        sm: "text-xs gap-2",
        default: "text-xs gap-4",
        lg: "text-sm gap-6",
      },
    },
    defaultVariants: {
      variant: "horizontal",
      position: "bottom",
      size: "default",
    },
  }
)

// Loading component
const LoadingComponent = () => (
  <div className="flex items-center justify-center space-x-1">
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
  </div>
)

// Error component
const ErrorComponent = ({ error }: { error: string }) => (
  <div className="flex flex-col items-center justify-center text-center p-6">
    <p className="text-sm font-medium text-destructive">Failed to load chart</p>
    <p className="text-xs text-muted-foreground mt-1">{error}</p>
  </div>
)

// Empty component
const EmptyComponent = () => (
  <div className="flex flex-col items-center justify-center text-center p-6">
    <p className="text-sm font-medium text-muted-foreground">No data available</p>
    <p className="text-xs text-muted-foreground mt-1">Chart will appear when data is provided</p>
  </div>
)

interface ChartContainerProps extends 
  React.ComponentProps<"div">,
  VariantProps<typeof chartContainerVariants> {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
  loading?: boolean
  error?: string
  isEmpty?: boolean
  loadingComponent?: React.ReactNode
  errorComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ 
    id, 
    className, 
    children, 
    config, 
    variant, 
    size, 
    responsive,
    loading,
    error,
    isEmpty,
    loadingComponent,
    errorComponent,
    emptyComponent,
    ...props 
  }, ref) => {
    const uniqueId = React.useId()
    const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

    // Show loading state
    if (loading) {
      return (
        <div
          data-chart={chartId}
          ref={ref}
          className={cn(
            chartContainerVariants({ variant, size, responsive }),
            "items-center",
            className
          )}
          {...props}
        >
          {loadingComponent || <LoadingComponent />}
        </div>
      )
    }

    // Show error state
    if (error) {
      return (
        <div
          data-chart={chartId}
          ref={ref}
          className={cn(
            chartContainerVariants({ variant, size, responsive }),
            "items-center",
            className
          )}
          {...props}
        >
          {errorComponent || <ErrorComponent error={error} />}
        </div>
      )
    }

    // Show empty state
    if (isEmpty) {
      return (
        <div
          data-chart={chartId}
          ref={ref}
          className={cn(
            chartContainerVariants({ variant, size, responsive }),
            "items-center",
            className
          )}
          {...props}
        >
          {emptyComponent || <EmptyComponent />}
        </div>
      )
    }

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          data-chart={chartId}
          ref={ref}
          className={cn(
            chartContainerVariants({ variant, size, responsive }),
            className
          )}
          {...props}
        >
          <ChartStyle id={chartId} config={config} />
          <RechartsPrimitive.ResponsiveContainer>
            {children}
          </RechartsPrimitive.ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    )
  }
)
ChartContainer.displayName = "Chart"

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme || config.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

interface ChartTooltipContentProps extends 
  React.ComponentProps<"div">,
  VariantProps<typeof chartTooltipVariants> {
  active?: boolean
  payload?: any[]
  label?: any
  labelFormatter?: any
  formatter?: any
  color?: string
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: "line" | "dot" | "dashed"
  nameKey?: string
  labelKey?: string
  labelClassName?: string
}

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
      variant,
      size,
      ...props
    },
    ref
  ) => {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const key = `${labelKey || item?.dataKey || item?.name || "value"}`
      const itemConfig = getPayloadConfigFromPayload(config, item, key)
      const value =
        !labelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label

      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(value, payload)}
          </div>
        )
      }

      if (!value) {
        return null
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>
    }, [
      label,
      labelFormatter,
      payload,
      hideLabel,
      labelClassName,
      config,
      labelKey,
    ])

    if (!active || !payload?.length) {
      return null
    }

    const nestLabel = payload.length === 1 && indicator !== "dot"

    return (
      <div
        ref={ref}
        className={cn(
          chartTooltipVariants({ variant, size }),
          className
        )}
        {...props}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload.filter(Boolean).map((item, index) => {
            // Handle null/undefined items safely
            if (!item || typeof item !== 'object') {
              return null;
            }
            
            const key = `${nameKey || item.name || item.dataKey || "value"}`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)
            const indicatorColor = color || item.payload?.fill || item.color

            return (
              <div
                key={item.dataKey || index}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center"
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                            {
                              "h-2.5 w-2.5": indicator === "dot",
                              "w-1": indicator === "line",
                              "w-0 border-[1.5px] border-dashed bg-transparent":
                                indicator === "dashed",
                              "my-0.5": nestLabel && indicator === "dashed",
                            }
                          )}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between leading-none",
                        nestLabel ? "items-end" : "items-center"
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </span>
                      </div>
                      {item.value && (
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {itemConfig?.format ? itemConfig.format(item.value) : item.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltip"

const ChartLegend = RechartsPrimitive.Legend

interface ChartLegendContentProps extends 
  React.ComponentProps<"div">,
  Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign">,
  VariantProps<typeof chartLegendVariants> {
  hideIcon?: boolean
  nameKey?: string
  position?: "top" | "bottom" | "left" | "right"
}

const ChartLegendContent = React.forwardRef<HTMLDivElement, ChartLegendContentProps>(
  (
    { 
      className, 
      hideIcon = false, 
      payload, 
      verticalAlign = "bottom", 
      nameKey,
      variant,
      position,
      size,
      ...props
    },
    ref
  ) => {
    const { config } = useChart()

    if (!payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          chartLegendVariants({ variant, position: position || (verticalAlign === "top" ? "top" : "bottom"), size }),
          "justify-center",
          className
        )}
        {...props}
      >
        {payload.map((item) => {
          const key = `${nameKey || item.dataKey || "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)

          return (
            <div
              key={item.value}
              className={cn(
                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                !hideIcon && (
                  <div
                    className="h-2 w-2 shrink-0 rounded-[2px]"
                    style={{
                      backgroundColor: item.color,
                    }}
                  />
                )
              )}
              {itemConfig?.label}
            </div>
          )
        })}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegend"

// Simple Chart wrapper component
interface SimpleChartProps extends ChartContainerProps {
  data?: any[]
}

const SimpleChart = React.forwardRef<HTMLDivElement, SimpleChartProps>(
  ({ data, isEmpty: isEmptyProp, children, ...props }, ref) => {
    const isEmpty = isEmptyProp || !data || data.length === 0

    return (
      <ChartContainer ref={ref} isEmpty={isEmpty} {...props}>
        {children}
      </ChartContainer>
    )
  }
)
SimpleChart.displayName = "SimpleChart"

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  SimpleChart,
  useChart,
  chartContainerVariants,
  chartTooltipVariants,
  chartLegendVariants,
}
