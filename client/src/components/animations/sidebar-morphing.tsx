import { motion } from "framer-motion"
import { ReactNode } from "react"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

// Sidebar item morphing animation
export function SidebarItemMorph({ children, isActive, isExpanded }: {
  children: ReactNode
  isActive?: boolean
  isExpanded?: boolean
}) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      animate={prefersReducedMotion ? {
        borderRadius: isActive ? "0.375rem" : "0rem"
      } : {
        scale: isActive ? 1.02 : 1,
        borderRadius: isActive ? "0.375rem" : "0rem"
      }}
      whileHover={prefersReducedMotion ? {
        borderRadius: "0.375rem"
      } : {
        scale: 1.01,
        borderRadius: "0.375rem"
      }}
      className={isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent"}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25
      }}
    >
      {children}
    </motion.div>
  )
}

// Expandable sidebar section with morphing
export function SidebarExpandableMorph({
  children,
  isExpanded,
  className = ""
}: {
  children: ReactNode
  isExpanded: boolean
  className?: string
}) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={false}
      animate={{
        height: isExpanded ? "auto" : 0,
        opacity: isExpanded ? 1 : 0
      }}
      transition={prefersReducedMotion ? {
        height: { duration: 0 },
        opacity: { duration: 0 }
      } : {
        height: {
          type: "spring",
          stiffness: 300,
          damping: 30
        },
        opacity: {
          duration: 0.2,
          delay: isExpanded ? 0.1 : 0
        }
      }}
      className={`overflow-hidden ${className}`}
    >
      <motion.div
        animate={prefersReducedMotion ? {} : {
          y: isExpanded ? 0 : -10
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

// Sidebar toggle morphing animation
export function SidebarToggleMorph({ isOpen }: { isOpen: boolean }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      animate={prefersReducedMotion ? {} : {
        rotate: isOpen ? 90 : 0
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 15 15"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.38508 7.84188C4.20477 7.64955 4.20477 7.35027 4.38508 7.15794L8.13508 3.15794C8.32394 2.95648 8.64036 2.94628 8.84182 3.13514Z"
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    </motion.div>
  )
}