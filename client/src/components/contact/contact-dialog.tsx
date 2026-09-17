import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiRequest } from "@/lib/queryClient";
import {
  contactVariant,
  type ContactSubmission,
  type ContactSubmissionReceipt,
  useContactConfig,
} from "@/lib/contact";
import "@/styles/pages/contact.css";

const singleLine = (max: number, field: string) =>
  z.string().trim().min(1, `${field} is required`).max(max, `${field} must be ${max} characters or less`)
    .refine((value) => !/\p{Cc}/u.test(value), `${field} must be a single line`);

const schema = z.object({
  name: singleLine(100, "Name"),
  replyTo: z.string().trim().email("Enter a valid email address").max(320, "Email address is too long"),
  subject: singleLine(200, "Subject"),
  message: z.string().trim().min(20, "Message must be at least 20 characters").max(4000, "Message must be 4000 characters or less")
    .refine((value) => !value.includes("\u0000"), "Message contains an invalid character"),
  // Deliberately accepts a value: the server treats it as a silent honeypot
  // success and never persists it. Rejecting it client-side would reveal it.
  website: z.string().max(2048).optional(),
});

type FormData = z.infer<typeof schema>;

export function ContactDialogHost() {
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<ContactSubmissionReceipt | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const config = useContactConfig(contactVariant === "b" || contactVariant === "e");
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", replyTo: "", subject: "", message: "", website: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: ContactSubmission) =>
      apiRequest("/api/contact", {
        method: "POST",
        body: JSON.stringify(data),
      }) as Promise<ContactSubmissionReceipt>,
    onSuccess: (data) => {
      setReceipt(data);
      form.reset();
    },
  });
  const { reset: resetMutation, isError: submissionFailed } = mutation;

  useEffect(() => {
    const onOpen = () => {
      openerRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      // Keep entered values after a failed submission, but do not carry an
      // old transport/rate-limit error into a newly opened dialog. Never
      // reset a pending request: reopening must not enable a second send.
      if (submissionFailed) resetMutation();
      setReceipt(null);
      setOpen(true);
    };
    window.addEventListener("awesome:open-contact-form", onOpen);
    return () => window.removeEventListener("awesome:open-contact-form", onOpen);
  }, [resetMutation, submissionFailed]);

  if (contactVariant !== "b" && contactVariant !== "e") return null;

  const formConfig = config.data?.contact.form;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="contact-dialog sm:max-w-lg"
        data-testid="contact-dialog"
        onCloseAutoFocus={(event) => {
          const opener = openerRef.current;
          if (opener?.isConnected) {
            event.preventDefault();
            opener.focus();
          }
        }}
      >
        <DialogHeader>
          <div className="eyebrow" aria-hidden>{"// Contact"}</div>
          <DialogTitle className="font-display text-2xl font-medium tracking-tight">
            Contact <em className="not-italic text-[var(--accent)]">maintainers</em>
          </DialogTitle>
          <DialogDescription>
            Send a message to the maintainers. Submissions are stored for review; this form does not promise email delivery.
          </DialogDescription>
        </DialogHeader>

        {receipt ? (
          <div className="contact-dialog__success space-y-4" role="status" data-testid="contact-success">
            <p className="text-sm">Your message was received and queued for maintainer review.</p>
            <Button className="w-full" onClick={() => setOpen(false)}>Close</Button>
          </div>
        ) : config.isLoading ? (
          <div className="flex min-h-[120px] items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking availability…
          </div>
        ) : !formConfig?.available ? (
          <div
            className="contact-dialog__unavailable border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm"
            role="status"
            data-testid="contact-unavailable"
          >
            Contact form unavailable: {formConfig?.unavailableReason ?? (config.isError
              ? "Configuration could not be loaded."
              : "No persistence destination is configured.")}
          </div>
        ) : (
          <Form {...form}>
            <form
              className="contact-dialog__form space-y-4"
              onSubmit={(event) => {
                if (mutation.isPending) {
                  event.preventDefault();
                  return;
                }
                void form.handleSubmit((data) => mutation.mutate(data))(event);
              }}
              noValidate
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input autoComplete="name" data-testid="contact-name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="replyTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" autoComplete="email" data-testid="contact-email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl><Input data-testid="contact-subject" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl><Textarea rows={6} data-testid="contact-message" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <input
                className="hidden"
                data-testid="contact-honeypot"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                {...form.register("website")}
              />
              {mutation.isError ? (
                <p className="text-sm text-destructive" role="alert" data-testid="contact-submit-error">
                  {mutation.error instanceof ApiError && mutation.error.status === 429
                    ? `Too many contact requests. Please try again${mutation.error.retryAfterSec
                      ? ` in ${mutation.error.retryAfterSec} seconds`
                      : " later"}.`
                    : mutation.error instanceof Error
                      ? mutation.error.message
                      : "The message could not be submitted. Please try again."}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Your name, reply address, and message are stored so maintainers can review and respond.
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={mutation.isPending} data-testid="contact-submit">
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : "Submit message"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}