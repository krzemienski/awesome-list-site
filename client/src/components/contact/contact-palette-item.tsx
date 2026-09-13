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
  const isPaletteVariant = contactVariant === "b" || contactVariant === "e";
  const config = useContactConfig(isPaletteVariant);
  if (!isPaletteVariant) return null;

  const contact = config.data?.contact;
  const destination = [
    contact?.email,
    contact?.discussions,
    contact?.issues,
  ].find((item) => item?.available && item.href);
  const canOpenForm = contact?.form.available;
  if (!contact || (!canOpenForm && !destination)) return null;

  return (
    <CommandItem
      value="contact-maintainers"
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
      className="search-palette-row"
      data-testid="contact-palette-item"
    >
      <span className="search-palette-kind"><Mail aria-hidden="true" />page</span>
      <span className="search-palette-copy"><span>Get in touch</span><small>Contact the maintainers</small></span>
      <span className="search-palette-arrow" aria-hidden="true">→</span>
    </CommandItem>
  );
}