import { Mail } from "lucide-react";
import { CommandItem } from "@/components/ui/command";
import {
  contactVariant,
  openContactForm,
  useContactConfig,
} from "@/lib/contact";

export function ContactPaletteItem({
  closePalette,
}: {
  closePalette: () => void;
}) {
  const config = useContactConfig(contactVariant === "e");
  if (contactVariant !== "e") return null;

  const contact = config.data?.contact;
  const destination = [
    contact?.email,
    contact?.discussions,
    contact?.issues,
  ].find((item) => item?.available && item.href);
  const canOpenForm = contact?.form.available;
  const unavailableReason =
    contact?.form.unavailableReason ??
    contact?.email.unavailableReason ??
    contact?.discussions.unavailableReason ??
    contact?.issues.unavailableReason ??
    "No contact destination is configured.";

  return (
    <CommandItem
      value="contact-maintainers"
      disabled={!canOpenForm && !destination}
      onSelect={() => {
        closePalette();
        if (canOpenForm) openContactForm();
        else if (destination?.href) {
          window.open(
            destination.href,
            destination.href.startsWith("mailto:") ? "_self" : "_blank",
            "noopener,noreferrer",
          );
        }
      }}
      className="flex min-h-[44px] items-center gap-2 p-3 cursor-pointer"
      data-testid="contact-palette-item"
      title={!canOpenForm && !destination ? unavailableReason : undefined}
    >
      <Mail className="h-4 w-4 text-[var(--accent)]" />
      <span>Contact maintainers</span>
      {!canOpenForm && !destination ? (
        <span className="ml-auto text-xs text-muted-foreground">Unavailable</span>
      ) : null}
    </CommandItem>
  );
}