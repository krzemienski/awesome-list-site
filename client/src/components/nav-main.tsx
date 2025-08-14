"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { Link, useLocation } from "wouter"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
      count?: number
    }[]
    count?: number
  }[]
}) {
  const [location] = useLocation()
  
  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true
    if (path !== '/' && location.startsWith(path)) return true
    return false
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Categories</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  tooltip={item.title}
                  className={cn(
                    isActive(item.url) && "bg-accent text-accent-foreground"
                  )}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  {item.count && (
                    <Badge variant="outline" className="ml-auto h-5 px-1 text-xs">
                      {item.count}
                    </Badge>
                  )}
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        asChild
                        className={cn(
                          isActive(subItem.url) && "bg-accent text-accent-foreground"
                        )}
                      >
                        <Link href={subItem.url}>
                          <span>{subItem.title}</span>
                          {subItem.count && (
                            <Badge variant="outline" className="ml-auto h-4 px-1 text-xs">
                              {subItem.count}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}