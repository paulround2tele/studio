"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const Form = FormProvider

// Form Container Variants
const formVariants = cva(
  "space-y-6",
  {
    variants: {
      variant: {
        default: "",
        card: "p-6 border rounded-lg bg-card",
        inline: "space-y-0 space-x-4 flex flex-wrap items-end",
        modal: "space-y-4 max-h-[70vh] overflow-y-auto",
        compact: "space-y-3",
      },
      size: {
        sm: "text-sm",
        default: "",
        lg: "text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Form Item Variants  
const formItemVariants = cva(
  "space-y-2",
  {
    variants: {
      size: {
        sm: "space-y-1",
        default: "space-y-2", 
        lg: "space-y-3",
      },
      orientation: {
        vertical: "flex flex-col",
        horizontal: "grid grid-cols-1 md:grid-cols-3 gap-4 items-start",
      },
    },
    defaultVariants: {
      size: "default",
      orientation: "vertical",
    },
  }
)

// Form Section Component
interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  children: React.ReactNode
}

const FormSection = React.forwardRef<HTMLDivElement, FormSectionProps>(
  ({ className, title, description, children, ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn("space-y-4", className)} 
        role="group"
        aria-labelledby={title ? `${React.useId()}-title` : undefined}
        {...props}
      >
        {title && (
          <div className="space-y-1">
            <h3 className="text-lg font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    )
  }
)
FormSection.displayName = "FormSection"

// Form Actions Component
interface FormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  align?: "left" | "center" | "right" | "between"
}

const FormActions = React.forwardRef<HTMLDivElement, FormActionsProps>(
  ({ className, children, align = "right", ...props }, ref) => {
    const alignClasses = {
      left: "justify-start",
      center: "justify-center", 
      right: "justify-end",
      between: "justify-between",
    }
    
    return (
      <div 
        ref={ref}
        className={cn(
          "flex gap-2 pt-4 border-t",
          alignClasses[align],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
FormActions.displayName = "FormActions"

// Form Group Component for related fields
interface FormGroupProps extends React.HTMLAttributes<HTMLFieldSetElement> {
  legend?: string
  children: React.ReactNode
}

const FormGroup = React.forwardRef<HTMLFieldSetElement, FormGroupProps>(
  ({ className, legend, children, ...props }, ref) => {
    return (
      <fieldset 
        ref={ref}
        className={cn("space-y-4 border rounded-lg p-4", className)}
        {...props}
      >
        {legend && (
          <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 px-2">
            {legend}
          </legend>
        )}
        {children}
      </fieldset>
    )
  }
)
FormGroup.displayName = "FormGroup"

// Enhanced Form Root Component
interface FormRootProps 
  extends React.FormHTMLAttributes<HTMLFormElement>,
    VariantProps<typeof formVariants> {
  loading?: boolean
  disabled?: boolean
}

const FormRoot = React.forwardRef<HTMLFormElement, FormRootProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <form
        ref={ref}
        className={cn(
          formVariants({ variant, size }),
          loading && "pointer-events-none opacity-60",
          disabled && "pointer-events-none opacity-50",
          className
        )}
        aria-busy={loading}
        aria-disabled={disabled}
        {...props}
      >
        {children}
      </form>
    )
  }
)
FormRoot.displayName = "FormRoot"

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

interface FormItemProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formItemVariants> {}

const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(
  ({ className, size, orientation, ...props }, ref) => {
    const id = React.useId()

    return (
      <FormItemContext.Provider value={{ id }}>
        <div 
          ref={ref} 
          className={cn(formItemVariants({ size, orientation }), className)} 
          {...props} 
        />
      </FormItemContext.Provider>
    )
  }
)
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

const formDescriptionVariants = cva(
  "text-sm text-muted-foreground",
  {
    variants: {
      variant: {
        default: "",
        hint: "text-muted-foreground/80",
        help: "text-blue-600 dark:text-blue-400",
        warning: "text-amber-600 dark:text-amber-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface FormDescriptionProps 
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof formDescriptionVariants> {}

const FormDescription = React.forwardRef<HTMLParagraphElement, FormDescriptionProps>(
  ({ className, variant, ...props }, ref) => {
    const { formDescriptionId } = useFormField()

    return (
      <p
        ref={ref}
        id={formDescriptionId}
        className={cn(formDescriptionVariants({ variant }), className)}
        {...props}
      />
    )
  }
)
FormDescription.displayName = "FormDescription"

const formMessageVariants = cva(
  "text-sm font-medium",
  {
    variants: {
      variant: {
        default: "text-destructive",
        error: "text-destructive",
        success: "text-green-600 dark:text-green-400",
        warning: "text-amber-600 dark:text-amber-400",
        info: "text-blue-600 dark:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface FormMessageProps 
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof formMessageVariants> {}

const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
  ({ className, children, variant, ...props }, ref) => {
    const { error, formMessageId } = useFormField()
    const body = error ? String(error?.message ?? "") : children

    if (!body) {
      return null
    }

    // Auto-detect variant from error type if not specified
    const autoVariant = variant || (error ? "error" : "default")

    return (
      <p
        ref={ref}
        id={formMessageId}
        className={cn(formMessageVariants({ variant: autoVariant }), className)}
        role={error ? "alert" : undefined}
        aria-live={error ? "polite" : undefined}
        {...props}
      >
        {body}
      </p>
    )
  }
)
FormMessage.displayName = "FormMessage"

// Simple Form Wrapper for common use cases
interface SimpleFormProps extends FormRootProps {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  title?: string
  description?: string
  submitText?: string
  cancelText?: string
  onCancel?: () => void
  loading?: boolean
  children: React.ReactNode
}

const SimpleForm = React.forwardRef<HTMLFormElement, SimpleFormProps>(
  ({ 
    onSubmit, 
    title, 
    description, 
    submitText = "Submit", 
    cancelText = "Cancel",
    onCancel,
    loading,
    children,
    variant = "card",
    ...props 
  }, ref) => {
    return (
      <FormRoot ref={ref} variant={variant} loading={loading} onSubmit={onSubmit} {...props}>
        {title && (
          <div className="space-y-1">
            <h3 className="text-lg font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
        <FormActions>
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={loading}
            >
              {cancelText}
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "Loading..." : submitText}
          </Button>
        </FormActions>
      </FormRoot>
    )
  }
)
SimpleForm.displayName = "SimpleForm"

export {
  useFormField,
  Form,
  FormRoot,
  FormSection,
  FormActions,  
  FormGroup,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  SimpleForm,
}
