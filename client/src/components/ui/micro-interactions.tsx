import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChevronRight, 
  ChevronDown, 
  Star, 
  Eye, 
  ExternalLink,
  Heart,
  Bookmark,
  TrendingUp,
  Zap
} from "lucide-react";

// Animated Button with ripple effect
interface AnimatedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}

export function AnimatedButton({ 
  children, 
  onClick, 
  variant = "default", 
  size = "md",
  className = "",
  disabled = false
}: AnimatedButtonProps) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    
    const button = buttonRef.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newRipple = { x, y, id: Date.now() };
      setRipples(prev => [...prev, newRipple]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
      }, 600);
    }
    
    onClick?.();
  };

  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Button
        ref={buttonRef}
        variant={variant}
        size={size === "md" ? "sm" : size}
        onClick={handleClick}
        disabled={disabled}
        className={`relative overflow-hidden ${className}`}
      >
        {children}
        
        {/* Ripple effects */}
        {ripples.map(ripple => (
          <motion.span
            key={ripple.id}
            className="absolute bg-white/30 pointer-events-none"
            style={{
              left: ripple.x - 10,
              top: ripple.y - 10,
              width: 20,
              height: 20,
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </Button>
    </motion.div>
  );
}

// Animated Category Item with smooth transitions
interface AnimatedCategoryItemProps {
  name: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  isActive?: boolean;
}

export function AnimatedCategoryItem({
  name,
  count,
  isOpen,
  onToggle,
  children,
  isActive = false
}: AnimatedCategoryItemProps) {
  return (
    <div
      className="w-full"
    >
      <motion.button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
          isActive 
            ? 'bg-primary/10 text-primary' 
            : 'hover:bg-accent hover:text-accent-foreground'
        }`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="h-4 w-4" />
          </motion.div>
          <span className="font-medium">{name}</span>
        </div>
        
        <div>
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        </div>
      </motion.button>
      
      <AnimatePresence>
        {isOpen && children && (
          <div
            className="overflow-hidden"
          >
            <div className="pl-8 pt-2 space-y-1">
              {children}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Animated Resource Card with hover effects
interface AnimatedResourceCardProps {
  title: string;
  description: string;
  category: string;
  url: string;
  tags?: string[];
  metrics?: {
    stars?: number;
    views?: number;
    trending?: boolean;
  };
  index: number;
}

export function AnimatedResourceCard({
  title,
  description,
  category,
  url,
  tags = [],
  metrics,
  index
}: AnimatedResourceCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card className="h-full cursor-pointer transition-shadow hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg leading-tight mb-2 line-clamp-2">
                {title}
              </CardTitle>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {category}
                </Badge>
                {metrics?.trending && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Badge variant="default" className="text-xs bg-orange-500">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Trending
                    </Badge>
                  </motion.div>
                )}
              </div>
            </div>
            
            <motion.button
              onClick={() => setIsBookmarked(!isBookmarked)}
              className="p-2 hover:bg-accent transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                animate={{ 
                  scale: isBookmarked ? 1.2 : 1,
                  color: isBookmarked ? "#fbbf24" : "currentColor"
                }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </motion.div>
            </motion.button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <CardDescription className="text-sm line-clamp-3">
            {description}
          </CardDescription>
          
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag, tagIndex) => (
                <motion.div
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + tagIndex * 0.05 }}
                >
                  <Badge variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                </motion.div>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {/* Metrics */}
          {metrics && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {metrics.stars && (
                  <motion.div 
                    className="flex items-center gap-1"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Star className="h-3 w-3" />
                    <span>{metrics.stars}</span>
                  </motion.div>
                )}
                {metrics.views && (
                  <motion.div 
                    className="flex items-center gap-1"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Eye className="h-3 w-3" />
                    <span>{metrics.views}</span>
                  </motion.div>
                )}
              </div>
              
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AnimatedButton
                      size="sm"
                      onClick={() => window.open(url, '_blank')}
                      className="h-8"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Visit
                    </AnimatedButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Animated List Switcher Item
interface AnimatedListItemProps {
  name: string;
  description: string;
  category: string;
  stars?: number;
  isActive?: boolean;
  onClick: () => void;
  index: number;
}

export function AnimatedListItem({
  name,
  description,
  category,
  stars,
  isActive = false,
  onClick,
  index
}: AnimatedListItemProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className={`cursor-pointer transition-all ${
          isActive 
            ? 'ring-2 ring-primary shadow-md' 
            : 'hover:shadow-md hover:bg-accent/50'
        }`}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-base truncate">{name}</h4>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Badge variant="default" className="text-xs">
                      Active
                    </Badge>
                  </motion.div>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {description}
              </p>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {category}
                </Badge>
                {stars && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    <span>{stars.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            
            <motion.div
              className="flex items-center justify-center w-8 h-8 bg-primary/10"
              whileHover={{ rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-4 w-4 text-primary" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Floating Action Button with pulse animation
interface FloatingActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  position?: "bottom-right" | "bottom-left";
}

export function FloatingActionButton({
  onClick,
  icon,
  label,
  position = "bottom-right"
}: FloatingActionButtonProps) {
  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6"
  };

  return (
    <motion.div
      className={`fixed ${positionClasses[position]} z-50`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ 
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: 0.5
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <motion.button
        onClick={onClick}
        className="bg-primary text-primary-foreground p-4 shadow-lg hover:shadow-xl transition-shadow"
        animate={{ 
          boxShadow: [
            "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
            "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
          ]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        title={label}
      >
        {icon}
      </motion.button>
    </motion.div>
  );
}

// Page transition wrapper
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

// Staggered list animation
interface StaggeredListProps {
  children: React.ReactNode[];
  className?: string;
  staggerDelay?: number;
}

export function StaggeredList({ 
  children, 
  className = "", 
  staggerDelay = 0.1 
}: StaggeredListProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <div key={index}>
          {child}
        </div>
      ))}
    </div>
  );
}