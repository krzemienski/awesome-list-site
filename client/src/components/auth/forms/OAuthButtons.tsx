import type { IconType } from "react-icons";
import { FaApple, FaGithub, FaGoogle, FaXTwitter } from "react-icons/fa6";
import { Button } from "@/components/ui/button";

export type OAuthProvider = "oauth_google" | "oauth_github" | "oauth_apple" | "oauth_x";

const PROVIDERS: { strategy: OAuthProvider; name: string; Icon: IconType }[] = [
  { strategy: "oauth_google", name: "Google", Icon: FaGoogle },
  { strategy: "oauth_github", name: "GitHub", Icon: FaGithub },
  { strategy: "oauth_apple", name: "Apple", Icon: FaApple },
  { strategy: "oauth_x", name: "X", Icon: FaXTwitter },
];

interface OAuthButtonsProps {
  /** The provider whose redirect is in flight; every button waits until it settles. */
  redirecting: OAuthProvider | null;
  disabled: boolean;
  onSelect: (strategy: OAuthProvider) => void;
}

export function OAuthButtons({ redirecting, disabled, onSelect }: OAuthButtonsProps) {
  return (
    <div className="flex flex-col gap-2" data-testid="auth-oauth-buttons">
      {PROVIDERS.map(({ strategy, name, Icon }) => (
        <Button
          key={strategy}
          type="button"
          variant="outline"
          className="auth-edge w-full justify-center gap-2"
          disabled={disabled || redirecting !== null}
          onClick={() => onSelect(strategy)}
          data-testid={`button-oauth-${strategy}`}
        >
          <Icon aria-hidden="true" />
          {redirecting === strategy ? `Redirecting to ${name}…` : `Continue with ${name}`}
        </Button>
      ))}
    </div>
  );
}
