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
    <motion.div
      layout
      layoutId={layoutId}
      className={className}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        layout: {
          type: "spring",
          stiffness: 300,
          damping: 25
        },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 }
      }}
    >
      {children}
    </motion.div>
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
    <AnimatePresence mode="wait">
      <motion.div
        key={`grid-${categoryId}`}
        initial={{ 
          opacity: 0,
          scale: 0.95,
          y: 30,
          rotateY: -10
        }}
        animate={{ 
          opacity: 1,
          scale: 1,
          y: 0,
          rotateY: 0
        }}
        exit={{ 
          opacity: 0,
          scale: 0.95,
          y: -30,
          rotateY: 10
        }}
        transition={{
          type: "spring",
          stiffness: 350,
          damping: 30,
          staggerChildren: 0.05,
          delayChildren: 0.1
        }}
        className={className}
        style={{ transformStyle: "preserve-3d" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Stagger animation for card items
export const cardStaggerVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.9,
    rotateX: -5
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  }
}

export const containerStaggerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
}