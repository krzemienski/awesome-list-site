import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Helmet } from "react-helmet";
import "@/styles/pages/system.css";

interface ErrorPageProps {
  error: Error | unknown;
}

export default function ErrorPage({ error }: ErrorPageProps) {
  const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
  
  const handleRetry = () => {
    window.location.reload();
  };
  
  // min-h-full: fill <main>, which already fills the app shell, rather than
  // claiming a viewport height the shell may not have to give.
  return (
    <div className="system-state">
      <Helmet>
        <title>Error — Awesome Video</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <Card className="system-state-card">
        <CardHeader>
          <span className="chip bad system-state-code">Error</span>
          <div className="system-state-heading flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
            <h1 className="display-h system-state-title">Something went wrong</h1>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            We encountered an error while loading the awesome list:
          </p>
          <div className="system-state-detail">
            {errorMessage}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            This might be due to a network issue or a problem with the source repository.
          </p>
        </CardContent>
        <CardFooter className="system-state-actions">
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
