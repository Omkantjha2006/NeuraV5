import { useEffect, useState } from 'react';
import { CheckCircle2, Plus, Trash2, ListTodo, Bookmark, StickyNote } from 'lucide-react';
import { productivityService } from '@/services/api';
import { useTranslation } from '@/i18n/I18nContext';
import type { ProductivityTask, SavedPrompt, WorkspaceNote } from '@/types';

export function ProductivityPage() {
  const { t } = useTranslation();
  const [tasks,setTasks]=useState<ProductivityTask[]>([]); const [prompts,setPrompts]=useState<SavedPrompt[]>([]); const [notes,setNotes]=useState<WorkspaceNote[]>([]);
  const [title,setTitle]=useState(''); const [loading,setLoading]=useState(true);
  useEffect(()=>{ Promise.all([productivityService.tasks(),productivityService.prompts(),productivityService.notes()]).then(([tk,p,n])=>{setTasks(tk);setPrompts(p);setNotes(n)}).finally(()=>setLoading(false)); },[]);
  const addTask=async()=>{if(!title.trim())return; const task=await productivityService.createTask({title:title.trim()});setTasks(x=>[task,...x]);setTitle('');};
  const toggle=async(task:ProductivityTask)=>{const u=await productivityService.updateTask(task.id,{status:task.status==='done'?'todo':'done'});setTasks(x=>x.map(i=>i.id===u.id?u:i));};
  const addPrompt=async()=>{const p=await productivityService.createPrompt({title:t('productivity.promptTitle',{n:prompts.length+1}),prompt:t('productivity.promptBody')});setPrompts(x=>[p,...x]);};
  const addNote=async()=>{const n=await productivityService.saveNote({title:t('productivity.noteTitle',{n:notes.length+1}),content:''});setNotes(x=>[n,...x]);};
  if(loading)return <div className="flex-1 flex items-center justify-center text-ink-400">{t('productivity.loadingWorkspace')}</div>;
  return <div className="flex-1 overflow-y-auto app-bg"><div className="max-w-6xl mx-auto p-6 space-y-6">
    <div><h1 className="text-2xl font-bold text-white">{t('productivity.title')}</h1><p className="text-ink-400">{t('productivity.subtitle')}</p></div>
    <div className="grid lg:grid-cols-3 gap-5">
      <section className="glass rounded-2xl p-5"><h2 className="font-semibold text-white flex items-center gap-2"><ListTodo size={18}/> {t('productivity.tasks')}</h2><div className="flex gap-2 mt-4"><input value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&void addTask()} placeholder={t('productivity.addTaskPlaceholder')} className="flex-1 input-glass"/><button onClick={()=>void addTask()} className="btn-primary"><Plus size={16}/></button></div><div className="mt-4 space-y-2">{tasks.map(task=><div key={task.id} className="flex items-center gap-2 glass-subtle rounded-lg p-3"><button onClick={()=>void toggle(task)}><CheckCircle2 size={18} className={task.status==='done'?'text-success-400':'text-ink-500'}/></button><span className={task.status==='done'?'line-through text-ink-500':'text-white'}>{task.title}</span><button className="ml-auto text-ink-500 hover:text-red-400" onClick={()=>void productivityService.deleteTask(task.id).then(()=>setTasks(x=>x.filter(i=>i.id!==task.id)))}><Trash2 size={15}/></button></div>)}</div></section>
      <section className="glass rounded-2xl p-5"><h2 className="font-semibold text-white flex items-center gap-2"><Bookmark size={18}/> {t('productivity.savedPrompts')}</h2><button onClick={()=>void addPrompt()} className="btn-primary mt-4"><Plus size={16}/> {t('productivity.savePrompt')}</button><div className="mt-4 space-y-2">{prompts.map(p=><div key={p.id} className="glass-subtle rounded-lg p-3"><div className="text-white text-sm">{p.title}</div><div className="text-ink-400 text-xs mt-1 line-clamp-2">{p.prompt}</div></div>)}</div></section>
      <section className="glass rounded-2xl p-5"><h2 className="font-semibold text-white flex items-center gap-2"><StickyNote size={18}/> {t('productivity.workspaceNotes')}</h2><button onClick={()=>void addNote()} className="btn-primary mt-4"><Plus size={16}/> {t('productivity.newNote')}</button><div className="mt-4 space-y-2">{notes.map(n=><div key={n.id} className="glass-subtle rounded-lg p-3"><div className="text-white text-sm">{n.title}</div><div className="text-ink-400 text-xs mt-1">{n.content||t('productivity.emptyNote')}</div></div>)}</div></section>
    </div>
  </div></div>;
}
