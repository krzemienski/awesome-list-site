import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import ResourceCard from "@/components/ui/resource-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { deslugify, slugify } from "@/lib/utils";
import { Resource, AwesomeList } from "@/types/awesome-list";
import NotFound from "@/pages/not-found";
import { Helmet } from "react-helmet";
import { processAwesomeListData } from "@/lib/parser";

// Sample resources for categories
const sampleResources: Resource[] = [
  {
    id: "1",
    title: "Nextcloud",
    url: "https://nextcloud.com",
    description: "A suite of client-server software for creating and using file hosting services.",
    category: "File Transfer & Synchronization",
  },
  {
    id: "2",
    title: "Bitwarden",
    url: "https://bitwarden.com",
    description: "Open source password management solution.",
    category: "Password Managers",
  },
  {
    id: "3",
    title: "Jellyfin",
    url: "https://jellyfin.org",
    description: "Media system that puts you in control of managing and streaming your media.",
    category: "Media Streaming",
  },
  {
    id: "4",
    title: "Gitea",
    url: "https://gitea.io",
    description: "Painless self-hosted Git service written in Go.",
    category: "Software Development",
  },
  {
    id: "5",
    title: "Home Assistant",
    url: "https://home-assistant.io",
    description: "Open source home automation platform.",
    category: "Automation",
  },
  {
    id: "6",
    title: "Matomo",
    url: "https://matomo.org",
    description: "Google Analytics alternative that protects your data and your customers' privacy.",
    category: "Analytics",
  },
  {
    id: "7",
    title: "Grafana",
    url: "https://grafana.com",
    description: "The open and composable observability and data visualization platform.",
    category: "Monitoring",
  },
  {
    id: "8",
    title: "Plausible Analytics",
    url: "https://plausible.io",
    description: "Simple, lightweight (< 1 KB) and privacy-friendly analytics alternative to Google Analytics.",
    category: "Analytics",
  }
];

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  
  // Fetch awesome list data
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["/api/awesome-list"],
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  // Sample resources for the selected category
  useEffect(() => {
    if (slug) {
      // Convert slug back to category name
      const decodedCategoryName = deslugify(slug);
      setCategoryName(decodedCategoryName);
      
      // Set up some resources for the Communication Systems category
      if (slug === "communication-systems") {
        const communicationResources = [
          {
            id: "c1",
            title: "Element",
            url: "https://element.io",
            description: "All-in-one secure chat app for teams, friends and organizations powered by Matrix.",
            category: "Communication Systems"
          },
          {
            id: "c2",
            title: "Rocket.Chat",
            url: "https://rocket.chat",
            description: "Team collaboration platform with chat, video conferencing, and more.",
            category: "Communication Systems"
          },
          {
            id: "c3",
            title: "Mattermost",
            url: "https://mattermost.com",
            description: "Open source, self-hosted Slack alternative.",
            category: "Communication Systems"
          },
          {
            id: "c4",
            title: "Jitsi Meet",
            url: "https://jitsi.org/jitsi-meet/",
            description: "Secure, fully featured, open source video conferencing.",
            category: "Communication Systems"
          },
          {
            id: "c5",
            title: "Synapse",
            url: "https://github.com/matrix-org/synapse",
            description: "Matrix reference homeserver written in Python/Twisted.",
            category: "Communication Systems"
          },
          {
            id: "c6",
            title: "Mail-in-a-Box",
            url: "https://mailinabox.email",
            description: "Easy-to-deploy mail server in a box.",
            category: "Communication Systems"
          }
        ];
        setFilteredResources(communicationResources);
      } else {
        // For other categories, filter from sample resources
        const filteredCategoryResources = sampleResources.filter(
          resource => resource.category.toLowerCase().includes(decodedCategoryName.toLowerCase())
        );
        setFilteredResources(filteredCategoryResources);
      }
      
      // Don't need this section anymore as we're directly setting filteredResources above
    }
  }, [slug]);
  
  // Apply search filter and sorting separately
  useEffect(() => {
    if (filteredResources.length > 0) {
      let filtered = [...filteredResources];
      
      // Apply search filter
      if (searchTerm) {
        filtered = filtered.filter(
          resource => 
            resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            resource.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Apply sorting
      switch(sortBy) {
        case "name-asc":
          filtered.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case "name-desc":
          filtered.sort((a, b) => b.title.localeCompare(a.title));
          break;
        case "newest":
          // For demo purposes, using random sorting for "newest"
          filtered.sort(() => Math.random() - 0.5);
          break;
        default:
          break;
      }
      
      setFilteredResources(filtered);
    }
  }, [searchTerm, sortBy, filteredResources.length]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Skeleton className="h-12 w-1/2 mb-2" />
        <Skeleton className="h-6 w-3/4 mb-8" />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(9).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!categoryName && !isLoading) {
    return <NotFound />;
  }
  
  return (
    <div className="flex flex-col">
      {/* SEO Head */}
      <Helmet>
        <title>{categoryName} Resources - Awesome Selfhosted</title>
        <meta 
          name="description" 
          content={`Browse ${filteredResources.length} self-hosted resources in the ${categoryName} category.`} 
        />
      </Helmet>
      
      <h1 className="text-3xl font-bold tracking-tight mb-4">
        {categoryName}
      </h1>
      <p className="text-muted-foreground mb-6">
        {filteredResources.length} {filteredResources.length === 1 ? 'resource' : 'resources'} in this category
      </p>
      
      {/* Search and filter bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search resources..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </form>
        
        <div className="flex gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Sort:</span>
          <Select
            value={sortBy}
            onValueChange={setSortBy}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="newest">Newest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((resource, index) => (
          <ResourceCard 
            key={`${resource.title}-${index}`} 
            resource={resource}
            index={index}
          />
        ))}
      </div>
      
      {filteredResources.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-lg font-semibold mb-2">No resources found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? `No resources matching "${searchTerm}" in this category.` : 'There are no resources in this category.'}
          </p>
        </div>
      )}
    </div>
  );
}
