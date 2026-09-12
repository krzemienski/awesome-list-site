import { useEffect, useState } from "react";
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
import { apiRequest } from "@/lib/queryClient";
import {
  contactVariant,
  type ContactSubmission,
  type ContactSubmissionReceipt,
  useContactConfig,
} from "@/lib/contact";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  replyTo: z.string().trim().email("Enter a valid email address").max(254, "Email address is too long"),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(120, "Subject must be 120 characters or less"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(4000, "Message must be 4000 characters or less"),
  website: z.string().max(0).optional(),
});

type FormData = z.infer<typeof schema>;

export function ContactDialogHost() {
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<ContactSubmissionReceipt | null>(null);
  const config = useContactConfig(contactVariant === "b" || contactVariant === "e");
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", replyTo: "", subject: "", message: "", website: "" },
  });

  useEffect(() => {
    const onOpen = () => {
      setReceipt(null);
      setOpen(true);
    };
    window.addEventListener("awesome:open-contact-form", onOpen);
    return () => window.removeEventListener("awesome:open-contact-form", onOpen);
  }, []);

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

  if (contactVariant !== "b" && contactVariant !== "e") return null;

  const formConfig = config.data?.contact.form;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg" data-testid="contact-dialog">
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
          <div className="space-y-4" role="status" data-testid="contact-success">
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
            className="border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm"
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
              className="space-y-4"
              onSubmit={(event) => { void form.handleSubmit((data) => mutation.mutate(data))(event); }}
              noValidate
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input autoComplete="name" {...field} /></FormControl>
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
                    <FormControl><Input type="email" autoComplete="email" {...field} /></FormControl>
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
                    <FormControl><Input {...field} /></FormControl>
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
                    <FormControl><Textarea rows={6} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <input
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                {...form.register("website")}
              />
              {mutation.isError ? (
                <p className="text-sm text-destructive" role="alert" data-testid="contact-submit-error">
                  {mutation.error instanceof Error
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