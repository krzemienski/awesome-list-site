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
    <div className={className}>
      {children}
    </div>
  )
}

// Category-specific transition with morphing effects
export function CategoryTransition({ children, categoryKey }: { children: ReactNode, categoryKey: string }) {
  return (
    <div key={categoryKey}>
      {children}
    </div>
  )
}