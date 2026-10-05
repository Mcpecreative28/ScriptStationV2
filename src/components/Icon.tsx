import * as I from 'lucide-react';
import type { ComponentType } from 'react';

type IconProps = {
  name: keyof typeof I;
  size?: number;
};

export const Icon = ({ name, size = 18 }: IconProps) => {
  const C = I[name] as ComponentType<{
    size?: number;
    strokeWidth?: number;
  }>;

  return C ? <C size={size} strokeWidth={1.8} /> : null;
};