import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AwesomeList, Category } from "@/types/awesome-list";
import SEOHead from "@/components/layout/SEOHead";
import {
  FileText,
  Code,
  Play,
  Settings,
  Package,
  Server,
  Layers,
  Users,
} from "lucide-react";

interface HomeProps {
  awesomeList?: AwesomeList;
}

const categoryIcons: { [key: string]: any } = {
  "Intro & Learning": FileText,
  "Protocols & Transport": Server,
  "Encoding & Codecs": Code,
  "Players & Clients": Play,
  "Media Tools": Settings,
  "Standards & Industry": Package,
  "Infrastructure & Delivery": Layers,
  "General Tools": Settings,
  "Community & Events": Users,
};

export default function Home({ awesomeList }: HomeProps) {
  const categories = awesomeList?.categories || [];
  const totalResourceCount = awesomeList?.count || 0;

  // Calculate total resources including nested subcategories
  const calculateTotalResources = (category: Category): number => {
    let total = category.count;

    if (category.subcategories) {
      category.subcategories.forEach(sub => {
        total += sub.count;
        if (sub.subSubcategories) {
          sub.subSubcategories.forEach(subsub => {
            total += subsub.count;
          });
        }
      });
    }

    return total;
  };

  if (!awesomeList) {
    return (
      <div className="space-y-6">
        <SEOHead title="Loading - Awesome Video Resources" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-6 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SEOHead 
        title="Awesome Video Resources - 2,000+ Curated Development Tools"
        description="Discover 2,000+ curated video development resources including codecs, players, tools, and libraries. Find the perfect solution for your video project."
      />
      
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Awesome Video Resources
        </h1>
        <p className="text-muted-foreground">
          Explore {categories.length} categories with {totalResourceCount} curated resources
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => {
          const Icon = categoryIcons[category.name] || FileText;
          const totalCount = calculateTotalResources(category);

          // Category description (resources no longer embedded - optimized for performance)
          const description = '';
          
          return (
            <Link 
              key={category.slug} 
              href={`/category/${category.slug}`}
              aria-label={`View ${category.name} category with ${totalCount} resources`}
              data-testid={`link-category-${category.slug}`}
            >
              <Card 
                className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors border border-border bg-card text-card-foreground"
                data-testid={`card-category-${category.slug}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Icon className="h-6 w-6" />
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                    </div>
                    <Badge variant="secondary" data-testid={`badge-count-${category.slug}`}>{totalCount}</Badge>
                  </div>
                  {description && (
                    <CardDescription className="text-sm">
                      {description}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
