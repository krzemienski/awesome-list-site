import { motion, AnimatePresence } from "framer-motion"
import { ReactNode } from "react"

interface CardMorphingContainerProps {
  children: ReactNode
  layoutId?: string
  className?: string
}

// Smooth morphing container for cards
export function CardMorphingContainer({ children, layoutId, className = "" }: CardMorphingContainerProps) {
  return (
    <div
      className={className}
    >
      {children}
    </div>
  )
}

// Grid morphing animation for category changes
interface GridMorphingProps {
  children: ReactNode
  categoryId: string
  className?: string
}

export function GridMorphing({ children, categoryId, className = "" }: GridMorphingProps) {
  return (
    <div
      key={`grid-${categoryId}`}
      className={className}
    >
      {children}
    </div>
  )
}

// Stagger animation for card items
export const cardStaggerVariants = {
  hidden: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    rotateX: 0
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      duration: 0
    }
  }
}

export const containerStaggerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0,
      delayChildren: 0
    }
  }
}