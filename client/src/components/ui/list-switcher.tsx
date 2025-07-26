import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { 
  List, 
  Plus, 
  Star, 
  Users, 
  Clock, 
  Globe, 
  Code, 
  Book, 
  Zap,
  Search,
  ExternalLink,
  Download
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";

export interface AwesomeListConfig {
  id: string;
  name: string;
  description: string;
  repository: string;
  rawUrl: string;
  category: string;
  stars?: number;
  lastUpdated?: string;
  language?: string;
  contributors?: number;
  icon?: string;
  isActive?: boolean;
}

const FEATURED_LISTS: AwesomeListConfig[] = [
  {
    id: "awesome-selfhosted",
    name: "Awesome Self-Hosted",
    description: "A list of Free Software network services and web applications which can be hosted on your own servers",
    repository: "awesome-selfhosted/awesome-selfhosted",
    rawUrl: "https://raw.githubusercontent.com/awesome-selfhosted/awesome-selfhosted/master/README.md",
    category: "Self-Hosting",
    stars: 196000,
    language: "Various",
    contributors: 1800,
    icon: "🏠",
    isActive: true
  },
  {
    id: "awesome-react",
    name: "Awesome React",
    description: "A collection of awesome things regarding React ecosystem",
    repository: "enaqx/awesome-react",
    rawUrl: "https://raw.githubusercontent.com/enaqx/awesome-react/master/README.md",
    category: "JavaScript",
    stars: 63000,
    language: "JavaScript",
    contributors: 850,
    icon: "⚛️"
  },
  {
    id: "awesome-vue",
    name: "Awesome Vue",
    description: "A curated list of awesome things related to Vue.js",
    repository: "vuejs/awesome-vue",
    rawUrl: "https://raw.githubusercontent.com/vuejs/awesome-vue/master/README.md",
    category: "JavaScript",
    stars: 72000,
    language: "JavaScript",
    contributors: 1200,
    icon: "💚"
  },
  {
    id: "awesome-python",
    name: "Awesome Python",
    description: "A curated list of awesome Python frameworks, libraries, software and resources",
    repository: "vinta/awesome-python",
    rawUrl: "https://raw.githubusercontent.com/vinta/awesome-python/master/README.md",
    category: "Python",
    stars: 220000,
    language: "Python",
    contributors: 2500,
    icon: "🐍"
  },
  {
    id: "awesome-go",
    name: "Awesome Go",
    description: "A curated list of awesome Go frameworks, libraries and software",
    repository: "avelino/awesome-go",
    rawUrl: "https://raw.githubusercontent.com/avelino/awesome-go/main/README.md",
    category: "Go",
    stars: 130000,
    language: "Go",
    contributors: 2000,
    icon: "🔵"
  },
  {
    id: "awesome-machine-learning",
    name: "Awesome Machine Learning",
    description: "A curated list of awesome Machine Learning frameworks, libraries and software",
    repository: "josephmisiti/awesome-machine-learning",
    rawUrl: "https://raw.githubusercontent.com/josephmisiti/awesome-machine-learning/master/README.md",
    category: "AI/ML",
    stars: 65000,
    language: "Various",
    contributors: 1500,
    icon: "🤖"
  },
  {
    id: "awesome-docker",
    name: "Awesome Docker",
    description: "A curated list of Docker resources and projects",
    repository: "veggiemonk/awesome-docker",
    rawUrl: "https://raw.githubusercontent.com/veggiemonk/awesome-docker/master/README.md",
    category: "DevOps",
    stars: 29000,
    language: "Docker",
    contributors: 800,
    icon: "🐳"
  },
  {
    id: "awesome-kubernetes",
    name: "Awesome Kubernetes",
    description: "A curated list for awesome kubernetes sources",
    repository: "ramitsurana/awesome-kubernetes",
    rawUrl: "https://raw.githubusercontent.com/ramitsurana/awesome-kubernetes/master/README.md",
    category: "DevOps",
    stars: 15000,
    language: "Kubernetes",
    contributors: 600,
    icon: "☸️"
  }
];

const CATEGORIES = [
  { name: "All", icon: Globe, count: FEATURED_LISTS.length },
  { name: "Self-Hosting", icon: List, count: FEATURED_LISTS.filter(l => l.category === "Self-Hosting").length },
  { name: "JavaScript", icon: Code, count: FEATURED_LISTS.filter(l => l.category === "JavaScript").length },
  { name: "Python", icon: Code, count: FEATURED_LISTS.filter(l => l.category === "Python").length },
  { name: "Go", icon: Code, count: FEATURED_LISTS.filter(l => l.category === "Go").length },
  { name: "DevOps", icon: Zap, count: FEATURED_LISTS.filter(l => l.category === "DevOps").length },
  { name: "AI/ML", icon: Book, count: FEATURED_LISTS.filter(l => l.category === "AI/ML").length },
];

interface ListSwitcherProps {
  currentList: AwesomeListConfig;
  onListChange: (list: AwesomeListConfig) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function ListSwitcher({ 
  currentList, 
  onListChange, 
  isOpen, 
  onClose 
}: ListSwitcherProps) {
  const [customLists, setCustomLists] = useState<AwesomeListConfig[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const { toast } = useToast();

  // Load custom lists from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('custom-awesome-lists');
    if (saved) {
      try {
        setCustomLists(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load custom lists:', error);
      }
    }
  }, []);

  // Save custom lists to localStorage
  const saveCustomLists = (lists: AwesomeListConfig[]) => {
    localStorage.setItem('custom-awesome-lists', JSON.stringify(lists));
    setCustomLists(lists);
  };

  // Filter lists based on category and search
  const filteredLists = [...FEATURED_LISTS, ...customLists].filter(list => {
    const matchesCategory = selectedCategory === "All" || list.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      list.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      list.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // Switch to a different list
  const handleListSwitch = (list: AwesomeListConfig) => {
    onListChange(list);
    onClose();
    
    toast({
      title: "List Switched",
      description: `Now viewing ${list.name}`,
    });
  };

  // Add custom awesome list
  const handleAddCustomList = async () => {
    if (!customUrl) return;
    
    try {
      // Extract repository information from GitHub URL
      const urlMatch = customUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!urlMatch) {
        throw new Error('Invalid GitHub URL format');
      }
      
      const [, owner, repo] = urlMatch;
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`;
      
      const newList: AwesomeListConfig = {
        id: `custom-${Date.now()}`,
        name: `${repo.charAt(0).toUpperCase() + repo.slice(1)}`,
        description: `Custom awesome list from ${owner}/${repo}`,
        repository: `${owner}/${repo}`,
        rawUrl,
        category: "Custom",
        icon: "📝"
      };
      
      const updatedLists = [...customLists, newList];
      saveCustomLists(updatedLists);
      
      setCustomUrl("");
      setIsAddingCustom(false);
      
      toast({
        title: "Custom List Added",
        description: `${newList.name} has been added to your lists.`,
      });
      
    } catch (error) {
      toast({
        title: "Failed to Add List",
        description: "Please check the URL format and try again.",
        variant: "destructive",
      });
    }
  };

  // Remove custom list
  const removeCustomList = (listId: string) => {
    const updatedLists = customLists.filter(list => list.id !== listId);
    saveCustomLists(updatedLists);
    
    toast({
      title: "List Removed",
      description: "Custom list has been removed.",
    });
  };

  // Format number with K/M suffix
  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Awesome List Explorer
          </DialogTitle>
          <DialogDescription>
            Discover and switch between different awesome lists from the community.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Browse Lists</TabsTrigger>
            <TabsTrigger value="custom">Custom Lists</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search awesome lists..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2">
                {CATEGORIES.map(category => {
                  const Icon = category.icon;
                  return (
                    <Button
                      key={category.name}
                      variant={selectedCategory === category.name ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.name)}
                      className="whitespace-nowrap"
                    >
                      <Icon className="h-4 w-4 mr-1" />
                      {category.name} ({category.count})
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Lists Grid */}
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLists.map(list => (
                  <Card 
                    key={list.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      currentList.id === list.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleListSwitch(list)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{list.icon}</span>
                          <div>
                            <CardTitle className="text-base leading-tight">{list.name}</CardTitle>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {list.category}
                            </Badge>
                          </div>
                        </div>
                        {currentList.id === list.id && (
                          <Badge variant="default">Active</Badge>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <CardDescription className="text-sm line-clamp-2">
                        {list.description}
                      </CardDescription>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {list.stars && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {formatNumber(list.stars)}
                          </div>
                        )}
                        {list.contributors && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {formatNumber(list.contributors)}
                          </div>
                        )}
                        {list.language && (
                          <div className="flex items-center gap-1">
                            <Code className="h-3 w-3" />
                            {list.language}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleListSwitch(list);
                          }}
                        >
                          {currentList.id === list.id ? 'Current' : 'Switch'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://github.com/${list.repository}`, '_blank');
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Custom Awesome List
                </CardTitle>
                <CardDescription>
                  Add any GitHub awesome list by providing the repository URL
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="custom-url">GitHub Repository URL</Label>
                  <Input
                    id="custom-url"
                    placeholder="https://github.com/username/awesome-something"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleAddCustomList}
                  disabled={!customUrl}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add List
                </Button>
              </CardContent>
            </Card>

            {customLists.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Custom Lists</CardTitle>
                  <CardDescription>
                    Manage your personally added awesome lists
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {customLists.map(list => (
                      <div key={list.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{list.icon}</span>
                          <div>
                            <div className="font-medium">{list.name}</div>
                            <div className="text-sm text-muted-foreground">{list.repository}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm"
                            onClick={() => handleListSwitch(list)}
                          >
                            Switch
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => removeCustomList(list.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}