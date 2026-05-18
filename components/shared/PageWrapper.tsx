"use client";
import { motion, AnimatePresence } from "framer-motion";
import { pageTransition } from "@/lib/animations";

export function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      exit={pageTransition.exit}
    >
      {children}
    </motion.div>
  );
}
