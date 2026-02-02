"use client";

import { useState, useEffect } from "react";

interface Resource {
  id: number;
  name: string;
  url: string;
  description: string | null;
  githubStars: number | null;
  language: string | null;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  resources: Resource[];
  subcategories: {
    id: number;
    name: string;
    slug: string;
    resources: Resource[];
  }[];
}

interface AwesomeListData {
  title: string;
  description: string;
  categories: Category[];
  totalResources: number;
}

export default function Home() {
  const [data, setData] = useState<AwesomeListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    console.log("[v0] Fetching awesome-list...");
    fetch("/api/awesome-list")
      .then((res) => {
        console.log("[v0] API response status:", res.status);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("[v0] Received data:", data);
        console.log("[v0] Categories count:", data.categories?.length);
        console.log("[v0] Resources count:", data.totalResources);
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[v0] Fetch error:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading awesome resources...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-card rounded-lg border">
          <h2 className="text-xl font-semibold text-destructive mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const allResources = data?.categories.flatMap(cat => [
    ...cat.resources,
    ...cat.subcategories.flatMap(sub => sub.resources)
  ]) || [];

  const filteredResources = searchQuery
    ? allResources.filter(r => 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">{data?.title || "Awesome Video"}</h1>
              <p className="text-sm text-muted-foreground">{data?.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {data?.totalResources || 0} resources
              </span>
              <a 
                href="/login" 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 text-sm"
              >
                Login
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="container mx-auto px-4 py-6">
        <input
          type="text"
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="container mx-auto px-4 pb-6">
          <h2 className="text-lg font-semibold mb-4">
            Search Results ({filteredResources.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredResources.slice(0, 20).map((resource) => (
              <a
                key={resource.id}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-card border rounded-lg hover:border-primary transition-colors"
              >
                <h3 className="font-medium text-foreground">{resource.name}</h3>
                {resource.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {resource.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  {resource.githubStars && (
                    <span>* {resource.githubStars.toLocaleString()}</span>
                  )}
                  {resource.language && <span>{resource.language}</span>}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {!searchQuery && (
        <main className="container mx-auto px-4 pb-12">
          {data?.categories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No categories found. The database may be empty.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add some resources to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {data?.categories.map((category) => (
                <section key={category.id} className="border rounded-lg p-6 bg-card/30">
                  <h2 className="text-xl font-semibold text-primary mb-4">{category.name}</h2>
                  
                  {/* Direct resources */}
                  {category.resources.length > 0 && (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mb-6">
                      {category.resources.map((resource) => (
                        <a
                          key={resource.id}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-card border rounded-md hover:border-primary transition-colors"
                        >
                          <h3 className="font-medium text-sm">{resource.name}</h3>
                          {resource.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {resource.description}
                            </p>
                          )}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Subcategories */}
                  {category.subcategories.map((sub) => (
                    <div key={sub.id} className="mt-4">
                      <h3 className="text-md font-medium text-foreground mb-3">{sub.name}</h3>
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {sub.resources.map((resource) => (
                          <a
                            key={resource.id}
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 bg-card border rounded-md hover:border-primary transition-colors"
                          >
                            <h4 className="font-medium text-sm">{resource.name}</h4>
                            {resource.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {resource.description}
                              </p>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  );
}
