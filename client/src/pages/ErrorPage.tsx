import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Helmet } from "react-helmet";

interface ErrorPageProps {
  error: Error | unknown;
}

export default function ErrorPage({ error }: ErrorPageProps) {
  const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
  
  const handleRetry = () => {
    window.location.reload();
  };
  
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <Helmet>
        <title>Error - Awesome List Static Site</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            We encountered an error while loading the awesome list:
          </p>
          <div className="bg-muted p-3 rounded-md text-sm font-mono overflow-auto max-h-32">
            {errorMessage}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            This might be due to a network issue or a problem with the source repository.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-4">
          <Button variant="outline" onClick={handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
          <Button asChild>
            <a 
              href="https://github.com/sindresorhus/awesome" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Visit Awesome Lists
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
