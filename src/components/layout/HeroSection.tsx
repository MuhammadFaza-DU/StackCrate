'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import type { ReactNode } from 'react';
import type { PublicStats } from '@/lib/public-stats';
import type { Message } from '@/i18n/types';
import { getCountUpValue } from '@/lib/count-up';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { formatCount } from '@/i18n/server';

const text = (message: Message) => typeof message === 'function' ? message() : message;

interface HeroSectionProps {
  title: string;
  subtitle: string;
  /** Right-column slot; pass FeaturedCard (or skeleton handled by caller). */
  heroNode?: ReactNode;
  /** Social-proof numbers (real from DB); null hides the row. */
  stats?: PublicStats | null;
}

function CountUp({ value, locale, suffix = '' }: { value: number; locale: 'id' | 'en'; suffix?: string }) {
  const reduceMotion = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;

    let frame = 0;
    const startedAt = performance.now();
    const duration = 900;

    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const easedProgress = 1 - (1 - progress) ** 3;
      setCount(getCountUpValue(0, value, easedProgress));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [reduceMotion, value]);

  const displayedCount = reduceMotion ? value : count;
  return <>{formatCount(displayedCount, locale)}{suffix}</>;
}

export function HeroSection({ title, subtitle, heroNode, stats }: HeroSectionProps) {
  const { locale, dictionary } = useLocale();
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -36]);
  const contentOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.42]);
  const contentScale = useTransform(scrollYProgress, [0, 1], [1, 0.97]);

  return (
    <m.section
      ref={sectionRef}
      id="home"
      className="relative min-h-[100dvh] flex items-center overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-transparent"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden
      />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" aria-hidden />

      <m.div
        className="relative z-10 w-full max-w-7xl mx-auto px-4 lg:px-8 py-16 md:py-24"
        style={reduceMotion ? undefined : { y: contentY, opacity: contentOpacity, scale: contentScale }}
      >
        <m.div
          initial={reduceMotion ? false : { opacity: 1, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center"
        >
          {/* Left narrative */}
          <div>
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold leading-tight mb-4 text-foreground">
              {title}
            </h1>
            <p className="font-body text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed mb-8">
              {subtitle}
            </p>

            {stats && (
              <div className="flex flex-wrap items-center gap-x-10 gap-y-4 mb-8">
                <div>
                   <p className="font-display text-3xl leading-none text-foreground"><CountUp value={stats.totalAssets} locale={locale} /></p>
                   <p className="mt-1.5 text-sm text-muted-foreground">{text(dictionary.home.statFreeAssets)}</p>
                </div>
                <span className="w-px h-11 bg-border" aria-hidden />
                <div>
                   <p className="font-display text-3xl leading-none text-foreground"><CountUp value={stats.totalCategories} locale={locale} /></p>
                   <p className="mt-1.5 text-sm text-muted-foreground">{text(dictionary.home.statCategories)}</p>
                </div>
                <span className="w-px h-11 bg-border" aria-hidden />
                <div>
                   <p className="font-display text-3xl leading-none text-foreground"><CountUp value={100} locale={locale} suffix="%" /></p>
                   <p className="mt-1.5 text-sm text-muted-foreground">{text(dictionary.home.statFreeForever)}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-lg hover:brightness-110 active:translate-y-[1px] transition"
              >
                {text(dictionary.home.ctaExplore)}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Right hero card */}
          <div className="hidden lg:block min-w-0">{heroNode}</div>
        </m.div>
      </m.div>
    </m.section>
  );
}
