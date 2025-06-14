import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Grid, List, ExternalLink } from "lucide-react";
import { Resource } from "@/types/awesome-list";

interface SimpleLayoutProps {
  resources: Resource[];
  title: string;
  description: string;
}

export default function SimpleLayout({ resources, title, description }: SimpleLayoutProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  // Filter resources based on search and category
  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || resource.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ["all", ...Array.from(new Set(resources.map(r => r.category)))];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-primary mb-2">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === "all" ? "All Categories" : category}
              </option>
            ))}
          </select>

          {/* Layout Toggle */}
          <div className="flex gap-2">
            <Button
              variant={layout === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setLayout("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={layout === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setLayout("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Showing {filteredResources.length} of {resources.length} resources
          </p>
        </div>

        {/* Resources Grid/List */}
        <div className={layout === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
          : "space-y-4"
        }>
          {filteredResources.map(resource => (
            <Card key={resource.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight">
                      {resource.title}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {resource.description}
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="ghost" asChild>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{resource.category}</Badge>
                  {(resource.tags || []).slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {(resource.tags || []).length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{(resource.tags || []).length - 3}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredResources.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No resources found matching your criteria.</p>
          </div>
        )}
      </main>
    </div>
  );
}