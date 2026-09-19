'use client';

type LogoProps = {
  inverted?: boolean;
};

export function LogoMark({ size = 32, tile = false, label }: { size?: number; tile?: boolean; label?: string }) {
  const image = (
    <img
      src="/logo-mark.png"
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      width={tile ? Math.round(size * 0.78) : size}
      height={tile ? Math.round(size * 0.78) : size}
      className="shrink-0 select-none"
      draggable={false}
    />
  );
  if (!tile) return image;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl bg-white shadow-sm"
      style={{ width: size, height: size }}
    >
      {image}
    </span>
  );
}

export function Logo({ inverted = false }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={inverted ? 40 : 36} tile={inverted} />
      <span className={`text-lg font-bold tracking-tight ${inverted ? 'text-white' : 'text-fg'}`}>UniFlow</span>
    </div>
  );
}
