import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../lib/utils";
import React from "react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: 'scale' | 'lift' | 'none';
    delay?: number;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ children, className, hoverEffect = 'lift', delay = 0, ...props }, ref) => {
        const hoverAnimations = {
            scale: { scale: 1.02 },
            lift: { y: -4, scale: 1.02 },
            none: {}
        };

        return (
            <motion.div
                ref={ref}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                    delay,
                    duration: 0.4,
                    ease: "easeOut"
                }}
                whileHover={hoverAnimations[hoverEffect]}
                className={cn(
                    "premium-glass p-6 rounded-[2.5rem]",
                    "bg-white/80 dark:bg-white/5",
                    "transition-all duration-300",
                    "hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/50",
                    hoverEffect !== 'none' && "cursor-pointer",
                    className
                )}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);

GlassCard.displayName = "GlassCard";
