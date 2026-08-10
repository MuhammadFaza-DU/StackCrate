'use client';

import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';
import * as React from 'react';

/**
 * MotionProvider: LazyMotion with domAnimation features for bundle size.
 * All animations in the app use framer-motion through this provider.
 * Respects prefers-reduced-motion via MotionConfig.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}