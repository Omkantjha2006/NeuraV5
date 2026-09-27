import {
  Sparkles, Code2, GraduationCap, Search, PenTool,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  code: Code2,
  'graduation-cap': GraduationCap,
  search: Search,
  'pen-tool': PenTool,
};

export function AgentIcon({
  icon,
  className,
  size = 20,
}: {
  icon: string;
  className?: string;
  size?: number;
}) {
  const Cmp = ICON_MAP[icon] ?? Sparkles;
  return <Cmp className={className} size={size} />;
}
