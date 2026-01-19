import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

interface ScrollToTopProps {
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const ScrollToTop: React.FC<ScrollToTopProps> = ({ scrollContainerRef }) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            setShow(container.scrollTop > 300);
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [scrollContainerRef]);

    const scrollToTop = () => {
        scrollContainerRef.current?.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    onClick={scrollToTop}
                    className="fixed bottom-8 right-8 z-[100] size-12 rounded-2xl premium-glass text-blue-500 shadow-xl hover:-translate-y-1 active:scale-95 flex items-center justify-center group/top transition-all duration-300"
                    aria-label="Scroll to top"
                >
                    <ArrowUp size={20} className="group-hover/top:scale-110 transition-transform duration-300" strokeWidth={2.5} />
                </motion.button>
            )}
        </AnimatePresence>
    );
};
