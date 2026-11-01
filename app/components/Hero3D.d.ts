import type { ComponentType } from 'react';

type Hero3DProps = {
  onOpenChat?: () => void;
  onStageChange?: (stage: number) => void;
};

declare const Hero3D: ComponentType<Hero3DProps>;
export default Hero3D;
