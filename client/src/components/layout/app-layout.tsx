import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AwesomeList } from "@/types/awesome-list"
import SearchDialog from "@/components/ui/search-dialog"
import ThemeSelector from "@/components/ui/theme-selector"
import Footer from "@/components/layout/Footer"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AppLayoutProps {
  awesomeList?: AwesomeList
  isLoading: boolean
  children: React.ReactNode
}

export function AppLayout({ awesomeList, isLoading, children }: AppLayoutProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <SidebarProvider>
      <AppSidebar 
        categories={awesomeList?.categories || []} 
        isLoading={isLoading}
      />
      <SidebarInset>
        {/* Header */}
        <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
          <SidebarTrigger className="-ml-1" />
          
          <div className="flex flex-1 items-center gap-2">
            <div className="flex-1">
              <Button
                variant="outline"
                className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-64"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="mr-2 h-4 w-4" />
                <span className="hidden lg:inline-flex">Search resources...</span>
                <span className="inline-flex lg:hidden">Search...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">/</span>
                </kbd>
              </Button>
            </div>
            
            <ThemeSelector />
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1 flex-col">
          <main className="flex-1 p-4 md:p-6">
            {children}
          </main>
          
          <Footer />
        </div>
      </SidebarInset>
      
      {/* Search Dialog */}
      <SearchDialog 
        isOpen={searchOpen} 
        setIsOpen={setSearchOpen}
        resources={awesomeList?.resources || []}
      />
    </SidebarProvider>
  )
}