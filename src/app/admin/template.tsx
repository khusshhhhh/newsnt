"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * template.tsx remounts on every navigation (unlike layout.tsx), so this
 * fades each new admin page in without re-animating the sidebar, which
 * lives in the layout above this and stays mounted across navigations.
 */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
