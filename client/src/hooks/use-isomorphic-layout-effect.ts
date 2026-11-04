import { useEffect, useLayoutEffect } from "react";

/** useLayoutEffect on the client; useEffect during SSR, where layout effects warn. */
export const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
