import { useState, useEffect } from "react";
import { 
  Command, 
  CommandInput, 
  CommandList, 
  CommandEmpty, 
  CommandGroup, 
  CommandItem,
  CommandDialog 
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink } from "lucide-react";
import { Resource } from "@/types/awesome-list";

interface ResourceSearchCommandProps {
  resources: Resource[];
  onResourceSelect?: (resource: Resource) => void;
  placeholder?: string;
  className?: string;
}

export default function ResourceSearchCommand({ 
  resources, 
  onResourceSelect,
  placeholder = "Search resources...",
  className 
}: ResourceSearchCommandProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  // Filter resources based on search value
  const filteredResources = resources.filter(resource => {
    const searchTerm = value.toLowerCase();
    return (
      resource.title.toLowerCase().includes(searchTerm) ||
      resource.description.toLowerCase().includes(searchTerm) ||
      resource.category.toLowerCase().includes(searchTerm) ||
      resource.subcategory.toLowerCase().includes(searchTerm) ||
      resource.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  });

  // Handle keyboard shortcut to open search
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [open]);

  const handleResourceSelect = (resource: Resource) => {
    if (onResourceSelect) {
      onResourceSelect(resource);
    }
    // Open resource in new tab
    window.open(resource.url, '_blank', 'noopener,noreferrer');
    setOpen(false);
    setValue("");
  };

  return (
    <>
      <Button
        variant="outline"
        className={`justify-start text-sm text-muted-foreground h-9 w-full sm:w-64 ${className}`}
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        {placeholder}
        <div className="ml-auto flex items-center gap-1">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </Button>
      
      <CommandDialog 
        open={open} 
        onOpenChange={setOpen}
        title="Search Resources"
        description="Find and open resources from the awesome list"
      >
        <CommandInput 
          placeholder={placeholder}
          value={value}
          onValueChange={setValue}
        />
        <CommandList>
          <CommandEmpty>No resources found.</CommandEmpty>
          <CommandGroup heading="Resources">
            {filteredResources.slice(0, 50).map((resource, index) => (
              <CommandItem
                key={`${resource.title}-${resource.url}`}
                value={`${resource.title} ${resource.description} ${resource.category}`}
                onSelect={() => handleResourceSelect(resource)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm line-clamp-1">
                      {resource.title}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                      {resource.description}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {resource.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {resource.subcategory}
                      </Badge>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 ml-2 shrink-0" />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}