import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, BookOpen, TrendingUp, Users, Code2, Zap, ChevronRight, Github, Chrome, ArrowRight, Star, GitFork, Eye } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  const handleLogin = (provider: string) => {
    // Navigate to OAuth login endpoint
    window.location.href = `/api/login?provider=${provider}`;
  };

  const stats = [
    { label: "Resources", value: "2,500+", icon: BookOpen },
    { label: "Categories", value: "50+", icon: Code2 },
    { label: "Active Users", value: "10K+", icon: Users },
    { label: "Daily Updates", value: "100+", icon: TrendingUp }
  ];

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Recommendations",
      description: "Get personalized resource suggestions based on your skill level and interests"
    },
    {
      icon: BookOpen,
      title: "Curated Learning Paths",
      description: "Follow structured paths from beginner to advanced, tailored to your goals"
    },
    {
      icon: Zap,
      title: "Real-time Updates",
      description: "Stay current with the latest tools, libraries, and best practices"
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            {/* Logo/Brand */}
            <div className="flex justify-center items-center gap-3 mb-8">
              <div className="relative">
                <div className="absolute inset-0 blur-2xl bg-gradient-to-r from-pink-500 to-cyan-500 opacity-30"></div>
                <Sparkles className="relative h-12 w-12 text-pink-500" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
                Awesome Hub
              </h1>
            </div>

            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Discover, learn, and master the best tools and resources in tech. 
              Your personalized journey through the world of development starts here.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white border-0"
                onClick={() => handleLogin('github')}
              >
                <Github className="mr-2 h-5 w-5" />
                Login with GitHub
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="w-full sm:w-auto border-cyan-500/50 hover:bg-cyan-500/10 hover:border-cyan-500"
                onClick={() => handleLogin('google')}
              >
                <Chrome className="mr-2 h-5 w-5" />
                Login with Google
              </Button>
            </div>

            {/* GitHub Stats */}
            <div className="flex justify-center items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                12.5K Stars
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="h-4 w-4 text-cyan-500" />
                3.2K Forks
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4 text-pink-500" />
                1M+ Views
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <Icon className="h-8 w-8 text-cyan-500 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
              Why Choose Awesome Hub?
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                  >
                    <Card className="p-6 h-full border-border hover:border-pink-500/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-gradient-to-r from-pink-500/10 to-cyan-500/10 rounded-lg">
                          <Icon className="h-6 w-6 text-pink-500" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-6">Ready to Start Your Journey?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of developers who are leveling up their skills every day.
            </p>
            <Button 
              size="lg"
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white border-0"
              onClick={() => handleLogin('github')}
            >
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}