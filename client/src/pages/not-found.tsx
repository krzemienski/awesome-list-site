import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home, List } from "lucide-react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <Helmet>
        <title>404 - Page Not Found</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <CardTitle>Page Not Found</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            We couldn't find the page you're looking for. The page may have been moved or doesn't exist.
          </p>
          <p className="text-sm text-muted-foreground">
            You can return to the home page to explore our curated collection of awesome resources.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-4">
          <Button variant="outline" asChild>
            <Link href="/">
              <List className="mr-2 h-4 w-4" />
              Browse Categories
            </Link>
          </Button>
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
