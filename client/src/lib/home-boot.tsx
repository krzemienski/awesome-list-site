import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { DehydratedState } from "@tanstack/react-query";
import type { HomeLayout } from "@shared/onboarding-values";

/**
 * Public, request-scoped values used to make the Home SSR tree deterministic.
 * This deliberately contains no Clerk/session/user data.
 */
export interface HomeBoot {
  url: string;
  path: "/";
  search: string;
  layout: HomeLayout;
  layoutSource: "url" | "cookie" | "default";
  /** HTML's pre-paint theme script remains the authority for localStorage. */
  theme: "prepaint";
  viewport: "desktop" | "tablet" | "phone";
  sidebarOpen: boolean;
  consent: "granted" | "denied" | null;
  /**
   * True only through the first hydrated render. The initial value is public
   * SSR data, not an ongoing client-side auth assertion.
   */
  isAnonymous: boolean;
}

const HomeBootContext = createContext<HomeBoot | null>(null);

export function HomeBootProvider({
  value,
  children,
}: {
  value: HomeBoot | null;
  children: ReactNode;
}) {
  const [activeValue, setActiveValue] = useState(value);

  // Preserve the server value for hydration, then retire its anonymous
  // assertion. Subsequent SPA auth and preference decisions must be driven by
  // their live browser/API sources rather than a request-time boot snapshot.
  useEffect(() => {
    if (activeValue?.isAnonymous) {
      setActiveValue({ ...activeValue, isAnonymous: false });
    }
  }, [activeValue]);

  return <HomeBootContext.Provider value={activeValue}>{children}</HomeBootContext.Provider>;
}

export function useHomeBoot(): HomeBoot | null {
  return useContext(HomeBootContext);
}

declare global {
  interface Window {
    __HOME_SSR__?: {
      boot: HomeBoot;
      dehydratedState: DehydratedState;
    };
  }
}