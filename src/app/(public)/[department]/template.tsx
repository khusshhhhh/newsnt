"use client";

import { motion } from "motion/react";

/**
 * template.tsx remounts on every navigation (unlike layout.tsx), so this
 * fades each new page in without re-animating the header/footer, which
 * live in the layout above this and stay mounted across navigations.
 */
export default function DepartmentTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
