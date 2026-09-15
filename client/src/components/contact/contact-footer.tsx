import type { ReactNode } from "react";
import { Mail, MessageCircle, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  contactVariant,
  openContactForm,
  useContactConfig,
  type ContactDestination,
} from "@/lib/contact";
import "@/styles/pages/contact.css";

function DestinationLink({
  destination,
  label,
  icon,
}: {
  destination?: ContactDestination;
  label: string;
  icon: ReactNode;
}) {
  if (!destination?.available || !destination.href) {
    return (
      <span
        className="contact-footer-link contact-footer-link--unavailable inline-flex min-h-[44px] items-center text-[color:var(--text-3)]"
        title={destination?.unavailableReason ?? `${label} is not configured`}
      >
        {label} unavailable
      </span>
    );
  }

  const isEmail = destination.href.startsWith("mailto:");
  return (
    <a
      href={destination.href}
      target={isEmail ? undefined : "_blank"}
      rel={isEmail ? undefined : "noopener noreferrer"}
      className="contact-footer-link inline-flex min-h-[44px] items-center gap-2 hover:text-[color:var(--text)] transition-colors"
      data-testid={`contact-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      {icon}
      {label}
    </a>
  );
}

export function ContactFooter() {
  const config = useContactConfig(
    contactVariant === "a" || contactVariant === "b" || contactVariant === "c",
  );
  if (!contactVariant || contactVariant === "d" || contactVariant === "e") return null;
  if (config.isLoading) {
    return (
      <span className="inline-flex min-h-[44px] items-center text-[color:var(--text-3)]">
        Checking contact options…
      </span>
    );
  }

  if (contactVariant === "a") {
    return (
      <>
        <DestinationLink
          destination={config.data?.contact.email}
          label="Email"
          icon={<Mail aria-hidden className="h-4 w-4" />}
        />
        <DestinationLink
          destination={config.data?.contact.issues}
          label="Report an issue"
          icon={<MessageCircle aria-hidden className="h-4 w-4" />}
        />
      </>
    );
  }
  if (contactVariant === "c") {
    return (
      <DestinationLink
        destination={config.data?.contact.discussions}
        label="GitHub Discussions"
        icon={<MessagesSquare aria-hidden className="h-4 w-4" />}
      />
    );
  }

  const form = config.data?.contact.form;
  return form?.available ? (
    <Button
      variant="ghost"
      className="contact-footer-open min-h-[44px] px-0 text-xs"
      onClick={openContactForm}
      data-testid="contact-open-form"
    >
      <Mail aria-hidden />
      Contact maintainers
    </Button>
  ) : (
    <span
      className="contact-footer-link contact-footer-link--unavailable inline-flex min-h-[44px] items-center text-[color:var(--text-3)]"
      title={form?.unavailableReason ?? "No persistence destination is configured"}
    >
      Contact form unavailable
    </span>
  );
}