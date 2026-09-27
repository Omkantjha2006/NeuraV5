import { useEffect, useState } from 'react';
import { BarChart3, MessageSquare, FileText, Brain, ListTodo } from 'lucide-react';
import { analyticsService } from '@/services/api';
import { useTranslation } from '@/i18n/I18nContext';

export function AnalyticsPage(){
 const { t } = useTranslation();
 const [data,setData]=useState<any>(null);
 useEffect(()=>{void analyticsService.overview().then(setData).catch(()=>setData(null));},[]);
 if(!data)return <div className="flex-1 flex items-center justify-center text-ink-400">{t('analytics.loading')}</div>;
 const cards=[[t('analytics.cards.conversations'),data.totals.conversations,MessageSquare],[t('analytics.cards.messages'),data.totals.messages,Brain],[t('analytics.cards.documents'),data.totals.documents,FileText],[t('analytics.cards.tasks'),data.totals.tasks,ListTodo]];
 return <div className="flex-1 overflow-y-auto app-bg"><div className="max-w-6xl mx-auto p-6"><div className="mb-7"><h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3/> {t('analytics.title')}</h1><p className="text-ink-400">{t('analytics.subtitle')}</p></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{cards.map(([label,value,Icon]:any)=><div className="glass rounded-2xl p-5" key={label}><Icon size={19} className="text-primary-400"/><div className="text-3xl font-bold text-white mt-3">{value}</div><div className="text-sm text-ink-400">{label}</div></div>)}</div><div className="grid lg:grid-cols-2 gap-5 mt-6"><div className="glass rounded-2xl p-5"><h2 className="text-white font-semibold mb-4">{t('analytics.recentActivity')}</h2>{data.conversationsByDay.length?<div className="space-y-3">{data.conversationsByDay.map((x:any)=><div key={x.date} className="flex items-center gap-3"><span className="text-xs text-ink-400 w-24">{x.date}</span><div className="h-2 rounded bg-primary-500/50" style={{width:`${Math.min(100,20+x.count*12)}%`}}/><span className="text-xs text-white">{x.count}</span></div>)}</div>:<p className="text-ink-500">{t('analytics.noActivityYet')}</p>}</div><div className="glass rounded-2xl p-5"><h2 className="text-white font-semibold mb-4">{t('analytics.mostUsedAgents')}</h2>{data.mostUsedAgents.length?data.mostUsedAgents.map((x:any)=><div key={x.agentId} className="flex justify-between py-2 border-b border-white/5 text-sm"><span className="text-white">{x.agentId}</span><span className="text-ink-400">{t('analytics.conversationsCount',{count:x.conversations})}</span></div>):<p className="text-ink-500">{t('analytics.noAgentActivityYet')}</p>}</div></div></div></div>;
}
