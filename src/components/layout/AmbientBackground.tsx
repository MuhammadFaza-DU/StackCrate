export type AmbientVariant = 'home' | 'explore' | 'favorites' | 'detail' | 'auth' | 'legal';

export function getAmbientVariantClass(variant: AmbientVariant) {
  return `ambient-${variant}`;
}

export function AmbientBackground({ variant }: { variant: AmbientVariant }) {
  return (
    <div
      className={`ambient-background ${getAmbientVariantClass(variant)}`}
      aria-hidden="true"
    >
      <div className="ambient-background__grid" />
      <div className="ambient-background__orb ambient-background__orb--one" />
      <div className="ambient-background__orb ambient-background__orb--two" />
      <div className="ambient-background__vignette" />
    </div>
  );
}
