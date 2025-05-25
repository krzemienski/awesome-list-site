import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Star, Search, Grid3X3, X, Github, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";

interface AwesomeListMeta {
  id: string;
  name: string;
  title: string;
  description: string;
  url: string;
  rawUrl: string;
  stars: number;
  language: string;
  category: string;
  owner: string;
  ownerAvatar: string;
  lastUpdated: string;
  topics: string[];
}

interface AwesomeListsResponse {
  lists: AwesomeListMeta[];
  totalCount: number;
  hasMore: boolean;
}

export default function AwesomeListExplorer() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [page, setPage] = useState(1);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch awesome lists from GitHub
  const { data: listsData, isLoading, error } = useQuery<AwesomeListsResponse>({
    queryKey: searchQuery 
      ? ['/api/github/search', { q: searchQuery, page }]
      : ['/api/github/awesome-lists', { page, per_page: 30 }],
    enabled: isOpen,
  });

  // Switch to a different awesome list
  const switchListMutation = useMutation({
    mutationFn: async (rawUrl: string) => {
      return apiRequest('/api/switch-list', 'POST', { rawUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/awesome-list'] });
      setIsOpen(false);
      toast({
        title: "List switched successfully!",
        description: "The new awesome list has been loaded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to switch list",
        description: "Please try again or check if the list is valid.",
        variant: "destructive",
      });
    },
  });

  // Get unique categories from the lists
  const categories = listsData?.lists ? 
    ["All", ...Array.from(new Set(listsData.lists.map(list => list.category)))] : 
    ["All"];

  // Filter lists by category
  const filteredLists = listsData?.lists.filter(list => 
    selectedCategory === "All" || list.category === selectedCategory
  ) || [];

  // Reset page when search query or category changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory]);

  const handleSwitchList = (list: AwesomeListMeta) => {
    switchListMutation.mutate(list.rawUrl);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-sm"
        >
          <Grid3X3 className="h-4 w-4" />
          <span className="hidden sm:inline">Switch List</span>
          <span className="sm:hidden">Lists</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent 
        className={`${isMobile ? 'max-w-[95vw] h-[90vh] p-3' : 'max-w-4xl h-[80vh] p-6'} flex flex-col`}
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              Awesome List Explorer
            </DialogTitle>
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Discover and switch between different awesome lists from the community
          </p>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="space-y-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search awesome lists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filters - Scrollable on mobile */}
          <div className="w-full overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="flex gap-2 pb-2" style={{ width: 'max-content' }}>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedCategory(category);
                    console.log('Category selected:', category);
                  }}
                  className="whitespace-nowrap flex-shrink-0 touch-manipulation"
                  style={{ touchAction: 'manipulation' }}
                >
                  {category}
                  {category !== "All" && listsData?.lists && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {listsData.lists.filter(list => list.category === category).length}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Lists Content */}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Loading awesome lists...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <p className="text-sm text-red-500">Failed to load awesome lists</p>
                <p className="text-xs text-muted-foreground">Check your internet connection</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-3 pr-3">
                {filteredLists.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No lists found</p>
                    {searchQuery && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Try a different search term
                      </p>
                    )}
                  </div>
                ) : (
                  filteredLists.map((list) => (
                    <div
                      key={list.id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer group"
                      onClick={() => handleSwitchList(list)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={list.ownerAvatar} alt={list.owner} />
                          <AvatarFallback>
                            {list.owner.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary">
                                {list.title}
                              </h3>
                              <p className="text-xs text-muted-foreground">{list.owner}</p>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Star className="h-3 w-3" />
                                {formatNumber(list.stars)}
                              </div>
                              {switchListMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          </div>
                          
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {list.description}
                          </p>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {list.category}
                            </Badge>
                            {list.language !== "Various" && (
                              <Badge variant="outline" className="text-xs">
                                {list.language}
                              </Badge>
                            )}
                            {list.topics.slice(0, isMobile ? 1 : 2).map((topic) => (
                              <Badge key={topic} variant="outline" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {/* Load More Button */}
                {listsData?.hasMore && filteredLists.length > 0 && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <Separator />
        <div className="flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
          <span>
            {listsData?.totalCount ? `${listsData.totalCount.toLocaleString()} lists available` : 'GitHub Awesome Lists'}
          </span>
          <div className="flex items-center gap-1">
            <Github className="h-3 w-3" />
            <span>GitHub</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}