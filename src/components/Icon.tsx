import { icons } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type IconProps = {
  name: keyof typeof icons;
  size?: number;
};

export const Icon = ({ name, size = 18 }: IconProps) => {
  const C: LucideIcon | undefined = icons[name];

  if (!C) {
    return null;
  }

  return <C size={size} strokeWidth={1.8} />;
};
