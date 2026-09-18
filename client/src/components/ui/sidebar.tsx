import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { VariantProps, cva } from "class-variance-authority"
import { PanelLeft, X } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { SheetDescription } from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
// Canonical shell geometry comes from the parity tokens. Keep these aliases in
// the primitive so consumers that use the shadcn sidebar API still get the
// same 280/240px shell as AppSidebar.
const SIDEBAR_WIDTH = "var(--shell-sidebar-w, 280px)"
const SIDEBAR_WIDTH_TABLET = "var(--shell-sidebar-w-tablet, 240px)"
const SIDEBAR_WIDTH_MOBILE = "86%"
const SIDEBAR_WIDTH_ICON = "var(--shell-rail-w, 56px)"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  isDrawer: boolean
  isPhone: boolean
  toggleSidebar: () => void
  setDrawerTrigger: (trigger: HTMLElement | null) => void
  restoreDrawerFocus: () => boolean
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean
    initialOpen?: boolean
    initialDrawer?: boolean
    initialPhone?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(
  (
    {
      defaultOpen = false,
      initialOpen,
      initialDrawer,
      initialPhone,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile()
    const [isDrawer, setIsDrawer] = React.useState(initialDrawer ?? false)
    const [isPhone, setIsPhone] = React.useState(initialPhone ?? false)
    const [openMobile, setOpenMobile] = React.useState(false)
    // Radix retains its own opener, but the responsive header can rerender
    // while the drawer closes. Keep the element that actually opened this
    // drawer so Escape never falls through to an unrelated header link.
    const drawerTriggerRef = React.useRef<HTMLElement | null>(null)

    // The canonical shell keeps the 240px sidebar visible at tablet widths,
    // but the header menu still opens the same drawer used on phones. This is
    // intentionally distinct from useIsMobile(), which remains the public
    // phone-only signal consumed by existing layout code.
    React.useEffect(() => {
      const media = window.matchMedia("(max-width: 1024px)")
      const update = () => setIsDrawer(media.matches)
      update()
      media.addEventListener("change", update)
      return () => media.removeEventListener("change", update)
    }, [])

    // useIsMobile intentionally preserves the historical <768 public hook
    // contract. The canonical sidebar cutoff is strictly below 768, so keep
    // this separate for deciding whether the hidden static copy should mount.
    React.useEffect(() => {
      const media = window.matchMedia("(max-width: 767px)")
      const update = () => setIsPhone(media.matches)
      update()
      media.addEventListener("change", update)
      return () => media.removeEventListener("change", update)
    }, [])

    const [_open, _setOpen] = React.useState<boolean>(() => {
      if (initialOpen !== undefined) return initialOpen
      if (typeof window === "undefined") return defaultOpen
      const stored = window.localStorage.getItem(SIDEBAR_COOKIE_NAME)
      return stored === null ? defaultOpen : stored === "true"
    })
    const open = openProp ?? _open
    React.useEffect(() => {
      if (initialOpen === undefined || openProp !== undefined) return
      try {
        const cookie = document.cookie.match(
          new RegExp(`(?:^|;\\s*)${SIDEBAR_COOKIE_NAME}=([^;]*)`),
        )?.[1]
        if (cookie === "true" || cookie === "false") {
          _setOpen(cookie === "true")
          return
        }
        const stored = window.localStorage.getItem(SIDEBAR_COOKIE_NAME)
        _setOpen(stored === null ? defaultOpen : stored === "true")
      } catch {
        _setOpen(defaultOpen)
      }
    }, [defaultOpen, initialOpen, openProp])
    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value
        if (setOpenProp) {
          setOpenProp(openState)
        } else {
          _setOpen(openState)
          try {
            window.localStorage.setItem(SIDEBAR_COOKIE_NAME, String(openState))
            document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; Path=/; Max-Age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax`
          } catch {
            /* localStorage unavailable (private mode) — non-fatal */
          }
        }
      },
      [setOpenProp, open]
    )

    const toggleSidebar = React.useCallback(() => {
      return isDrawer
        ? setOpenMobile((open) => !open)
        : setOpen((open) => !open)
    }, [isDrawer, setOpen, setOpenMobile])

    const setDrawerTrigger = React.useCallback((trigger: HTMLElement | null) => {
      drawerTriggerRef.current = trigger
    }, [])

    const restoreDrawerFocus = React.useCallback(() => {
      const isVisibleTrigger = (element: HTMLElement | null): element is HTMLElement =>
        !!element &&
        element.isConnected &&
        !element.hasAttribute("disabled") &&
        element.getClientRects().length > 0 &&
        getComputedStyle(element).visibility !== "hidden"

      // Prefer the exact control that opened the drawer. The query fallback
      // covers non-pointer opens (for example the Ctrl/Cmd+B shortcut).
      const trigger = isVisibleTrigger(drawerTriggerRef.current)
        ? drawerTriggerRef.current
        : Array.from(
            document.querySelectorAll<HTMLElement>('button[data-sidebar="trigger"]'),
          ).find(isVisibleTrigger)
      if (!trigger) return false
      trigger.focus({ preventScroll: true })
      return document.activeElement === trigger
    }, [])

    // Adds a keyboard shortcut to toggle the sidebar on all screen sizes
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault()
          toggleSidebar()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [toggleSidebar])

    // We add a state so that we can do data-state="expanded" or "collapsed".
    // This makes it easier to style the sidebar with Tailwind classes.
    const state = open ? "expanded" : "collapsed"

    React.useEffect(() => {
      if (openMobile) {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        // BUG-006 (run14): guarantee Escape dismisses the mobile drawer even
        // if focus sits outside the Radix dialog subtree.
        const handleEscape = (event: KeyboardEvent) => {
          if (event.key === "Escape") {
            setOpenMobile(false);
          }
        };
        window.addEventListener("keydown", handleEscape);
        return () => {
          document.body.style.overflow = prev;
          window.removeEventListener("keydown", handleEscape);
        };
      }
    }, [openMobile]);

    // A drawer is a viewport affordance, not a persisted preference. Do not
    // leave a phone/tablet drawer logically open after crossing to desktop.
    React.useEffect(() => {
      if (!isDrawer && openMobile) setOpenMobile(false)
    }, [isDrawer, openMobile])

    const contextValue = React.useMemo<SidebarContextProps>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
        isDrawer,
        isPhone,
        setDrawerTrigger,
        restoreDrawerFocus,
      }),
      [
        state,
        open,
        setOpen,
        isMobile,
        isDrawer,
        openMobile,
        setOpenMobile,
        toggleSidebar,
        isPhone,
        setDrawerTrigger,
        restoreDrawerFocus,
      ]
    )

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH,
                "--sidebar-width-tablet": SIDEBAR_WIDTH_TABLET,
                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              // Run22 BUG-014: overflow-x-HIDDEN made this wrapper a scroll
              // container, so the sticky header stuck to the wrapper's (never
              // scrolling) scrollport instead of the viewport. `clip` prevents
              // horizontal overflow WITHOUT creating a scroll container.
              "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar overflow-x-clip",
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    side?: "left" | "right"
    variant?: "sidebar" | "floating" | "inset"
    collapsible?: "offcanvas" | "icon" | "none"
    drawerContent?: React.ReactNode
  }
>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "offcanvas",
      drawerContent,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const {
      isDrawer,
      isPhone,
      state,
      openMobile,
      setOpenMobile,
      restoreDrawerFocus,
    } = useSidebar()

    /*
     * The canonical shell has one full sidebar at desktop and tablet widths.
     * At <=1024 the header trigger additionally opens the owned Radix drawer; the
     * tablet sidebar remains in place behind it. The static copy is display
     * none at phone widths. Consumers may provide drawerContent for canonical
     * drawer chrome while retaining the same category source and test IDs.
     */
    const staticSidebar = (
      <div
        ref={ref}
        className={cn(
          "av-sidebar-shell group peer shrink-0 text-sidebar-foreground",
          className,
        )}
        data-state="expanded"
        data-collapsible=""
        data-variant={variant}
        data-side={side}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          role="navigation"
          aria-label="Sidebar"
          className="flex h-full w-full flex-col"
        >
          {children}
        </div>
      </div>
    )

    const drawer = (
      <DialogPrimitive.Root open={openMobile} onOpenChange={setOpenMobile}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="av-sidebar-drawer-overlay" />
          <DialogPrimitive.Content
            data-sidebar="sidebar"
            data-mobile="true"
            className="av-sidebar-drawer text-sidebar-foreground"
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
              } as React.CSSProperties
            }
            aria-modal="true"
            onOpenAutoFocus={(e) => {
              // Enter the Radix focus scope on the first visible nav control.
              // The static tablet sidebar intentionally contains the same tree,
              // so only query inside the open dialog.
              const content = e.currentTarget as HTMLElement
              const first = Array.from(
                content.querySelectorAll<HTMLElement>(
                  "a[href], button:not([disabled])",
                ),
              ).find((el) => {
                const rect = el.getBoundingClientRect()
                return (
                  rect.width > 0 &&
                  rect.height > 0 &&
                  getComputedStyle(el).visibility !== "hidden"
                )
              })
              if (first) {
                e.preventDefault()
                first.focus()
              }
            }}
            onCloseAutoFocus={(e) => {
              // Restore the actual opener rather than whichever matching
              // header control happens to be first after responsive rerenders.
              // This is intentionally explicit: Radix's saved trigger can be
              // detached while AppHeader reacts to the drawer state.
              e.preventDefault()
              restoreDrawerFocus()
            }}
          >
            <DialogPrimitive.Title className="sr-only">
              Sidebar
            </DialogPrimitive.Title>
            <SheetDescription className="sr-only">
              Displays the sidebar navigation.
            </SheetDescription>
            <div
              data-sidebar="drawer-navigation"
              role="navigation"
              aria-label="Sidebar"
              className="flex h-full w-full flex-col"
            >
              {drawerContent ?? children}
            </div>
            <DialogPrimitive.Close
              asChild
              aria-label="Close sidebar"
            >
              <button
                type="button"
                className="icon-btn av-sidebar-drawer-close"
              >
                <X aria-hidden="true" />
                <span className="sr-only">Close</span>
              </button>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    )

    if (isDrawer) {
      return (
        <>
          {!isPhone && staticSidebar}
          {drawer}
        </>
      )
    }

    if (collapsible === "none") {
      return staticSidebar
    }

    return (
      <div
        ref={ref}
        className={cn(
          "group peer hidden md:block shrink-0 text-sidebar-foreground",
          state === "collapsed" && collapsible === "icon" && "pointer-events-none"
        )}
        data-state={state}
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-variant={variant}
        data-side={side}
      >
        <div
          className={cn(
            // DS shell parity: the sidebar starts BELOW the full-width header
            // (--header-height set by the layout; falls back to 0 for legacy
            // shells). The spacer height must match the fixed panel or the
            // page gains phantom scroll equal to the header height.
            // This one IS in flow, so unlike the fixed panel it must also give
            // back the shell's --app-bottom-inset: claiming the whole viewport
            // here would make every page taller than the shell has to give,
            // pushing a shell bottom row past the fold.
            "duration-200 relative h-[calc(100svh-var(--header-height,0px)-var(--app-bottom-inset,0px))] bg-transparent transition-[width] ease-linear",
            side === "right" && "rotate-180"
          )}
          style={{
            width:
              state === "collapsed" && collapsible === "offcanvas"
                ? "0px"
                : state === "collapsed" && collapsible === "icon"
                  ? variant === "floating" || variant === "inset"
                    ? "calc(var(--sidebar-width-icon) + 1rem)"
                    : "var(--sidebar-width-icon)"
                  : "var(--sidebar-width)",
          }}
        />
        <div
          className={cn(
            // DS shell parity: fixed panel is offset below the 60px header
            // (reference .sidebar/.icon-rail: sticky top:60px, height
            // calc(100vh - 60px)). Header is z-30, sidebar stays under it.
            "duration-200 fixed top-[var(--header-height,0px)] bottom-0 z-10 hidden h-[calc(100svh-var(--header-height,0px))] transition-[left,right,width] ease-linear md:flex",
            // Audit2 BUG-006: this column is fixed to the SCREEN, so the app
            // shell's flow layout cannot move it clear of an app-level bottom
            // bar overlaying the viewport's bottom edge. Reserve the shell's
            // --app-bottom-inset (0px when there is no bar) so the last sidebar
            // links stay scrollable into view and clickable.
            "pb-[var(--app-bottom-inset,0px)]",
            side === "left" && "left-0 border-r",
            side === "right" && "right-0 border-l",
            (variant === "floating" || variant === "inset") && "p-2",
            state === "collapsed" && collapsible === "icon" && "overflow-hidden pointer-events-auto",
            className
          )}
          style={{
            width:
              state === "collapsed" && collapsible === "offcanvas"
                ? "0px"
                : state === "collapsed" && collapsible === "icon"
                  ? variant === "floating" || variant === "inset"
                    ? "calc(var(--sidebar-width-icon) + 1rem + 2px)"
                    : "var(--sidebar-width-icon)"
                  : "var(--sidebar-width)",
            ...(state === "collapsed" && collapsible === "offcanvas"
              ? side === "left"
                ? { left: "calc(var(--sidebar-width) * -1)" }
                : { right: "calc(var(--sidebar-width) * -1)" }
              : {}),
          }}
          {...props}
        >
          <div
            data-sidebar="sidebar"
            role="navigation"
            aria-label="Sidebar"
            className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
          >
            {children}
          </div>
        </div>
      </div>
    )
  }
)
Sidebar.displayName = "Sidebar"

const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar, isDrawer, setDrawerTrigger } = useSidebar()

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={(event) => {
        onClick?.(event)
        if (isDrawer) setDrawerTrigger(event.currentTarget)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      ref={ref}
      data-sidebar="rail"
      aria-label="Toggle sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle sidebar"
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
        "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        "group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0",
        className
      )}
      {...props}
    />
  )
})
SidebarRail.displayName = "SidebarRail"

const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  /*
   * DS Migration WP-1 (CC-14) — SidebarInset is the chrome wrapper, not the
   * page landmark. The single <main id="main"> lives in MainLayout so axe's
   * `landmark-one-main` rule passes globally.
   */
  return (
    <div
      ref={ref}
      className={cn(
        // Run22 BUG-014: overflow-x-clip (not hidden) — hidden created a scroll
        // container that broke the sticky AppHeader inside this inset.
        "relative flex min-w-0 flex-1 flex-col bg-background overflow-x-clip max-w-full",
        "md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
        className
      )}
      {...props}
    />
  )
})
SidebarInset.displayName = "SidebarInset"

const SidebarInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      data-sidebar="input"
      className={cn(
        "h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className
      )}
      {...props}
    />
  )
})
SidebarInput.displayName = "SidebarInput"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      data-sidebar="separator"
      className={cn("mx-2 w-auto bg-sidebar-border", className)}
      {...props}
    />
  )
})
SidebarSeparator.displayName = "SidebarSeparator"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent"

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  )
})
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "flex h-8 shrink-0 items-center  px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className
      )}
      {...props}
    />
  )
})
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-sidebar="group-action"
      className={cn(
        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center  p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarGroupAction.displayName = "SidebarGroupAction"

const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cn("w-full text-sm", className)}
    {...props}
  />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cn("flex w-full min-w-0 flex-col gap-1", className)}
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    className={cn("group/menu-item relative", className)}
    {...props}
  />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden  p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string | React.ComponentProps<typeof TooltipContent>
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      tooltip,
      className,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const { isMobile, isDrawer, state } = useSidebar()

    const button = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
        {...props}
      />
    )

    // BUG-019 (run26): never wrap in Tooltip inside the mobile drawer.
    // Tooltips only matter in collapsed icon mode, which mobile never uses —
    // and the mount/unmount of the (hidden) tooltip node on focus/blur is a
    // DOM mutation that Radix FocusScope's MutationObserver treats as "focused
    // element removed", bouncing Tab focus back to the sheet container and
    // making the drawer's nav unreachable by keyboard.
    // The tablet drawer is a Radix focus scope too. Mounting Tooltip around a
    // focused control mutates that scope and can bounce keyboard focus out of
    // the open drawer, just as it does on phones.
    if (!tooltip || isMobile || isDrawer) {
      return button
    }

    if (typeof tooltip === "string") {
      tooltip = {
        children: tooltip,
      }
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          hidden={state !== "collapsed" || isMobile}
          {...tooltip}
        />
      </Tooltip>
    )
  }
)
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    showOnHover?: boolean
  }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center  p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="menu-badge"
    className={cn(
      "pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center  px-1 text-xs font-medium tabular-nums text-sidebar-foreground",
      "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
      "peer-data-[size=sm]/menu-button:top-1",
      "peer-data-[size=default]/menu-button:top-1.5",
      "peer-data-[size=lg]/menu-button:top-2.5",
      "group-data-[collapsible=icon]:hidden",
      className
    )}
    {...props}
  />
))
SidebarMenuBadge.displayName = "SidebarMenuBadge"

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    showIcon?: boolean
  }
>(({ className, showIcon = false, ...props }, ref) => {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`
  }, [])

  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn("flex h-8 items-center gap-2  px-2", className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 "
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 max-w-[--skeleton-width] flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  )
})
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    className={cn(
      "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
      "group-data-[collapsible=icon]:hidden",
      className
    )}
    {...props}
  />
))
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    asChild?: boolean
    size?: "sm" | "md"
    isActive?: boolean
  }
>(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden  px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}
