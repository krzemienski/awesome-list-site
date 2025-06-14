import SimpleLayout from "@/components/ui/simple-layout";
import { AwesomeList } from "@/types/awesome-list";

interface HomeProps {
  awesomeList?: AwesomeList;
  isLoading: boolean;
}

export default function Home({ awesomeList, isLoading }: HomeProps) {
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p className="text-muted-foreground">Fetching 2011 awesome video resources...</p>
        </div>
      </div>
    );
  }

  if (!awesomeList || !awesomeList.resources || awesomeList.resources.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">No Data Available</h1>
          <p className="text-muted-foreground">Unable to load awesome video resources.</p>
        </div>
      </div>
    );
  }

  return (
    <SimpleLayout
      resources={awesomeList.resources}
      title={awesomeList.title || "Awesome Video"}
      description={awesomeList.description || "A curated list of awesome video tools, frameworks and libraries"}
    />
  );
}