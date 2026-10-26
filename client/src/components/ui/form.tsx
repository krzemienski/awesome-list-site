"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
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

const Form = FormProvider

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

  const { id, hasDescription, hasMessage } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    hasDescription,
    hasMessage,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
  hasDescription: boolean
  hasMessage: boolean
  setHasDescription: (present: boolean) => void
  setHasMessage: (present: boolean) => void
}

// aria-describedby may only name ids that exist, so FormDescription and
// FormMessage report whether they are rendered and FormControl lists just those.
function useReportPresence(setPresent: (present: boolean) => void, present: boolean) {
  React.useLayoutEffect(() => {
    if (!present) return
    setPresent(true)
    return () => setPresent(false)
  }, [present, setPresent])
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId()
  const [hasDescription, setHasDescription] = React.useState(false)
  const [hasMessage, setHasMessage] = React.useState(false)
  const value = React.useMemo(
    () => ({ id, hasDescription, hasMessage, setHasDescription, setHasMessage }),
    [id, hasDescription, hasMessage]
  )

  return (
    <FormItemContext.Provider value={value}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  )
})
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
  const {
    error,
    formItemId,
    formDescriptionId,
    formMessageId,
    hasDescription,
    hasMessage,
  } = useFormField()
  const describedBy = [
    hasDescription && formDescriptionId,
    hasMessage && formMessageId,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={describedBy || undefined}
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()
  const { setHasDescription } = React.useContext(FormItemContext)
  useReportPresence(setHasDescription, true)

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId, name } = useFormField()
  const body = error ? String(error?.message ?? "") : children
  const { setHasMessage } = React.useContext(FormItemContext)
  useReportPresence(setHasMessage, Boolean(body))

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      role={error ? "alert" : undefined}
      data-field-error={error ? "" : undefined}
      data-testid={error ? `error-${name}` : undefined}
      className={cn(
        "text-sm font-medium text-destructive",
        error && "field-error",
        className
      )}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
