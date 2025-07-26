import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "../components/ui/skeleton";
import ResourceCard from "../components/ui/resource-card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Search, Filter } from "lucide-react";
import { deslugify } from "../lib/utils";
import { Resource, AwesomeList } from "../types/awesome-list";
import NotFound from "./not-found";
import { Helmet } from "react-helmet";

// Demo subcategory resources
const demoSubcategoryResources: Resource[] = [
  // Web Analytics subcategory
  {
    id: "wa1",
    title: "Matomo",
    url: "https://matomo.org",
    description: "Google Analytics alternative that protects your data and your customers' privacy.",
    category: "Analytics",
    subcategory: "Web Analytics"
  },
  {
    id: "wa2",
    title: "Plausible Analytics",
    url: "https://plausible.io",
    description: "Simple, lightweight (< 1 KB) and privacy-friendly analytics alternative to Google Analytics.",
    category: "Analytics",
    subcategory: "Web Analytics"
  },
  {
    id: "wa3",
    title: "Umami",
    url: "https://umami.is",
    description: "Simple, fast, privacy-focused alternative to Google Analytics.",
    category: "Analytics",
    subcategory: "Web Analytics"
  },
  {
    id: "wa4",
    title: "Shynet",
    url: "https://github.com/milesmcc/shynet",
    description: "Modern, privacy-friendly, and detailed web analytics that works without cookies or JS.",
    category: "Analytics",
    subcategory: "Web Analytics"
  },
  
  // Video Streaming subcategory
  {
    id: "vs1",
    title: "Jellyfin",
    url: "https://jellyfin.org",
    description: "Media system that puts you in control of managing and streaming your media.",
    category: "Media Streaming",
    subcategory: "Video Streaming"
  },
  {
    id: "vs2",
    title: "Kodi",
    url: "https://kodi.tv",
    description: "Free and Open Source home theater software.",
    category: "Media Streaming",
    subcategory: "Video Streaming"
  },
  {
    id: "vs3",
    title: "Dim",
    url: "https://github.com/Dusk-Labs/dim",
    description: "Self-hosted media manager powered by dark forces.",
    category: "Media Streaming",
    subcategory: "Video Streaming"
  },
  {
    id: "vs4",
    title: "Gerbera",
    url: "https://gerbera.io/",
    description: "UPnP Media Server for 2023.",
    category: "Media Streaming",
    subcategory: "Video Streaming"
  }
];

export default function Subcategory() {
  const { slug } = useParams<{ slug: string }>();
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  
  // Fetch awesome list data
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["/api/awesome-list"],
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  // Set up subcategory resources from demo data
  useEffect(() => {
    if (slug) {
      // For demo purposes, we'll check if the slug matches any of our demo subcategories
      const decodedName = deslugify(slug);
      let matchedSubcategory = "";
      let matchedCategory = "";
      let resources: Resource[] = [];
      
      // Look for matching subcategory in our demo data
      if (decodedName.toLowerCase().includes("web") && decodedName.toLowerCase().includes("analytics")) {
        matchedSubcategory = "Web Analytics";
        matchedCategory = "Analytics";
        resources = demoSubcategoryResources.filter(r => r.subcategory === "Web Analytics");
      } else if (decodedName.toLowerCase().includes("video") && decodedName.toLowerCase().includes("streaming")) {
        matchedSubcategory = "Video Streaming";
        matchedCategory = "Media Streaming";
        resources = demoSubcategoryResources.filter(r => r.subcategory === "Video Streaming");
      } else {
        // Default to show all resources if no match
        const firstSubcategory = demoSubcategoryResources[0].subcategory || "";
        matchedSubcategory = firstSubcategory;
        matchedCategory = demoSubcategoryResources[0].category;
        resources = demoSubcategoryResources.filter(r => r.subcategory === firstSubcategory);
      }
      
      setSubcategoryName(matchedSubcategory);
      setCategoryName(matchedCategory);
      setAllResources(resources);
    }
  }, [slug]);
  
  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...allResources];
    
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
        // For demo purposes, we'll just randomize the order
        filtered.sort(() => Math.random() - 0.5);
        break;
      default:
        break;
    }
    
    setFilteredResources(filtered);
  }, [allResources, searchTerm, sortBy]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Skeleton className="h-12 w-1/2 mb-2" />
        <Skeleton className="h-6 w-3/4 mb-8" />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!subcategoryName && !isLoading) {
    return <NotFound />;
  }
  
  return (
    <div className="flex flex-col">
      {/* SEO Head */}
      <Helmet>
        <title>{subcategoryName} - {categoryName} - Awesome Selfhosted</title>
        <meta 
          name="description" 
          content={`Browse ${filteredResources.length} ${subcategoryName} resources in the ${categoryName} category of Awesome Selfhosted.`} 
        />
      </Helmet>
      
      <div className="flex flex-col items-start gap-1 mb-4">
        <h1 className="text-3xl font-bold tracking-tight">
          {subcategoryName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Category: {categoryName}
        </p>
      </div>
      <p className="text-muted-foreground mb-6">
        {filteredResources.length} {filteredResources.length === 1 ? 'resource' : 'resources'} in this subcategory
      </p>
      
      {/* Search and filter bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search in this subcategory..."
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
            {searchTerm ? `No resources matching "${searchTerm}" in this subcategory.` : 'There are no resources in this subcategory.'}
          </p>
        </div>
      )}
    </div>
  );
}
