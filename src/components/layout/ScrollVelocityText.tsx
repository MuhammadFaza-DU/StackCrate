'use client';

import { m, useReducedMotion } from 'framer-motion';

interface ScrollVelocityTextProps {
  texts: string[];
  className?: string;
  separator?: string;
  /** seconds for one full loop; larger = slower */
  duration?: number;
}

export function ScrollVelocityText({
  texts,
  className = '',
  separator = ' ● ',
  duration = 30,
}: ScrollVelocityTextProps) {
  const reduceMotion = useReducedMotion();
  const totalText = texts.join(separator);

  return (
    <div className={`overflow-hidden py-4 md:py-10 ${className}`} aria-hidden="true">
      <m.div
        className="flex w-max"
        animate={reduceMotion ? undefined : { x: '-50%' }}
        transition={
          reduceMotion
            ? undefined
            : { ease: 'linear', duration, repeat: Infinity }
        }
      >
        {[0, 1].map((i) => (
          <span
            key={i}
            className="shrink-0 text-lg md:text-6xl font-display font-bold text-foreground/80 mx-3 md:mx-6 whitespace-nowrap"
          >
            {totalText}
          </span>
        ))}
      </m.div>
    </div>
  );
}
