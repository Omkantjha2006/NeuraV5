import { AgentIcon } from '@/components/AgentIcon';
import type { Agent } from '@/types';

export function AgentAvatar({
  agent,
  size = 'md',
  active = false,
  className = '',
}: {
  agent: Agent;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  className?: string;
}) {
  const sizes = {
    sm: { box: 'w-8 h-8 rounded-lg', icon: 14 },
    md: { box: 'w-11 h-11 rounded-xl', icon: 18 },
    lg: { box: 'w-14 h-14 rounded-2xl', icon: 24 },
  };
  const s = sizes[size];

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br ${agent.gradient} ${s.box} ${active ? 'glow-primary' : ''} ${className}`}
      style={{ boxShadow: active ? `0 0 16px ${agent.color}40` : undefined }}
    >
      <AgentIcon icon={agent.icon} size={s.icon} className="text-white" />
    </div>
  );
}
