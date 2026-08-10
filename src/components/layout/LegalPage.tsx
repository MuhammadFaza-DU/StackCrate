import type { ReactNode } from 'react';
import { AmbientBackground } from '@/components/layout/AmbientBackground';

interface LegalSection {
  id: string;
  heading: string;
  body: ReactNode;
}

interface LegalPageProps {
  title: string;
  updatedAt: string;
  description?: string;
  sections: LegalSection[];
}

export function LegalPage({ title, updatedAt, description, sections }: LegalPageProps) {
  return (
    <main className="relative isolate overflow-hidden">
      <AmbientBackground variant="legal" />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12 md:py-16">
      <header className="mb-10">
        <h1 className="font-heading text-3xl md:text-4xl text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{updatedAt}</p>
        {description && (
          <p className="mt-6 font-body text-base leading-relaxed text-foreground">
            {description}
          </p>
        )}
      </header>

      <div className="divide-y divide-border">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="py-8 first:pt-0 last:pb-0">
            <h2 className="font-heading text-xl text-foreground mb-3">{section.heading}</h2>
            <div className="font-body text-[15px] leading-relaxed text-foreground space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:text-foreground">
              {section.body}
            </div>
          </section>
        ))}
      </div>
      </div>
    </main>
  );
}
