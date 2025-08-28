import { motion } from "framer-motion"
import { ReactNode } from "react"

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

// Page transition variants with smooth morphing
const pageVariants = {
  initial: {
    opacity: 0,
    scale: 0.96,
    y: 20,
    filter: "blur(4px)"
  },
  in: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)"
  },
  out: {
    opacity: 0,
    scale: 1.04,
    y: -20,
    filter: "blur(4px)"
  }
}

const pageTransition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.8
}

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Category-specific transition with morphing effects
export function CategoryTransition({ children, categoryKey }: { children: ReactNode, categoryKey: string }) {
  return (
    <motion.div
      key={categoryKey}
      initial={{ 
        opacity: 0, 
        scale: 0.9,
        rotateX: -15,
        transformPerspective: 1000
      }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        rotateX: 0,
        transformPerspective: 1000
      }}
      exit={{ 
        opacity: 0, 
        scale: 1.1,
        rotateX: 15,
        transformPerspective: 1000
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        mass: 0.6
      }}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </motion.div>
  )
}