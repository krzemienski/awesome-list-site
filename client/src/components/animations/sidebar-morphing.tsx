import { motion } from "framer-motion"
import { ReactNode } from "react"

// Sidebar item morphing animation
export function SidebarItemMorph({ children, isActive, isExpanded }: { 
  children: ReactNode
  isActive?: boolean
  isExpanded?: boolean 
}) {
  return (
    <motion.div
      animate={{
        scale: isActive ? 1.02 : 1,
        backgroundColor: isActive ? "var(--sidebar-accent)" : "transparent",
        borderRadius: isActive ? "0.375rem" : "0rem"
      }}
      whileHover={{
        scale: 1.01,
        backgroundColor: "var(--sidebar-accent)",
        borderRadius: "0.375rem"
      }}
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
  return (
    <motion.div
      initial={false}
      animate={{
        height: isExpanded ? "auto" : 0,
        opacity: isExpanded ? 1 : 0
      }}
      transition={{
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
        animate={{
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
  return (
    <motion.div
      animate={{
        rotate: isOpen ? 0 : 180
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