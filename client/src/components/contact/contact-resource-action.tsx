import type { ReactNode } from "react";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contactVariant } from "@/lib/contact";
import "@/styles/pages/contact.css";

interface ContactResourceActionProps {
  onSuggestEdit: () => void;
  /** The existing core control. It remains rendered whenever variant D is off. */
  fallback: ReactNode;
}

export function ContactResourceAction({
  onSuggestEdit,
  fallback,
}: ContactResourceActionProps) {
  if (contactVariant !== "d") return <>{fallback}</>;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onSuggestEdit}
      data-testid="button-suggest-edit"
      className="contact-resource-action min-h-[44px] px-4"
      aria-label="Suggest an edit"
    >
      <Edit className="h-4 w-4 mr-2" />
      <span>Suggest Edit</span>
    </Button>
  );
}