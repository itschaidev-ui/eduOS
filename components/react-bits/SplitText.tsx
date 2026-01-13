import React from 'react';
import { motion, Variants } from 'framer-motion';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  animationFrom?: { opacity: number; transform: string };
  animationTo?: { opacity: number; transform: string };
  textAlign?: 'left' | 'center' | 'right';
  onLetterAnimationComplete?: () => void;
}

const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = '',
  delay = 100,
  animationFrom = { opacity: 0, transform: 'translate3d(0,40px,0)' },
  animationTo = { opacity: 1, transform: 'translate3d(0,0,0)' },
  textAlign = 'center',
  onLetterAnimationComplete,
}) => {
  const words = text.split(' ');
  const mediaQuery = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)') : null;
  const isMobile = mediaQuery ? mediaQuery.matches : false;

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: (i: number = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: delay / 1000 * i },
    }),
  };

  return (
    <p
      className={className}
      style={{ display: 'inline-block', textAlign }}
    >
        <motion.span
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            style={{ display: 'inline-block' }}
        >
            {words.map((word, i) => (
                <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom' }}>
                    <motion.span
                        style={{ display: 'inline-block' }}
                        variants={{
                            hidden: animationFrom,
                            visible: {
                                ...animationTo,
                                transition: {
                                    ease: [0.2, 0.65, 0.3, 0.9],
                                    duration: 1
                                }
                            }
                        }}
                    >
                        {word + (i !== words.length - 1 ? '\u00A0' : '')}
                    </motion.span>
                </span>
            ))}
        </motion.span>
    </p>
  );
};

export default SplitText;
