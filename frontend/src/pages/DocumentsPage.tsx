import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { useTranslation } from '@/i18n/I18nContext';
import { documentService, ragService } from '@/services/api';
import { AgentAvatar } from '@/components/AgentAvatar';
import { Modal } from '@/components/Modal';
import {
  Upload, FileText, File, Image, Trash2, Search, Loader2,
  AlertCircle, CheckCircle, X, Eye, Download, RefreshCw,
} from 'lucide-react';
import type { DocumentItem } from '@/types';

const ACCEPT = '.pdf,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp';

function getDocIcon(type: DocumentItem['type']) {
  if (type === 'pdf') return <FileText size={18} className="text-error-400" />;
  if (type === 'image') return <Image size={18} className="text-warning-400" />;
  return <File size={18} className="text-primary-400" />;
}

function isPreviewableText(doc: DocumentItem) {
  return doc.type === 'txt';
}

function isVisualPreview(doc: DocumentItem) {
  return doc.type === 'pdf' || doc.type === 'image';
}

export function DocumentsPage() {
  const { activeAgentId, agents, getAgent } = useApp();
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [textPreview, setTextPreview] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async (query = '') => {
    try {
      setError('');
      const data = await documentService.list(query);
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('documents.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadDocuments(search); }, 250);
    return () => window.clearTimeout(timer);
  }, [search, loadDocuments]);

  const filtered = useMemo(() => documents.filter((doc) => {
    return filterAgent === 'all' || doc.agentId === filterAgent;
  }), [documents, filterAgent]);

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(files)) {
        const uploaded = await documentService.upload(file, activeAgentId);
        setDocuments((prev) => [uploaded, ...prev.filter((d) => d.id !== uploaded.id)]);
      }
      setUploadOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : t('documents.errors.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError('');
      await documentService.delete(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (previewDoc?.id === id) setPreviewDoc(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('documents.errors.deleteFailed'));
    }
  };

  const openPreview = async (doc: DocumentItem) => {
    setPreviewDoc(doc);
    setTextPreview('');
    if (isPreviewableText(doc)) {
      setPreviewLoading(true);
      try {
        setTextPreview(await documentService.getTextPreview(doc.id));
      } catch (err) {
        setTextPreview(err instanceof Error ? err.message : t('documents.errors.previewFailed'));
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto app-bg">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8 animate-fade-in-up">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{t('documents.title')}</h1>
            <p className="text-ink-400">{t('documents.subtitle')}</p>
          </div>
          <button onClick={() => setUploadOpen(true)} className="btn-primary">
            <Upload size={16} /> {t('documents.upload')}
          </button>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-error-500/20 bg-error-500/10 px-4 py-3 text-sm text-error-300">
            <AlertCircle size={16} /> <span className="flex-1">{error}</span>
            <button onClick={() => setError('')}><X size={15} /></button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t('documents.searchPlaceholder')} className="input-glass pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button onClick={() => setFilterAgent('all')} className={`px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all ${filterAgent === 'all' ? 'glass-strong text-white' : 'glass-subtle text-ink-400 hover:text-white'}`}>{t('common.all')}</button>
            {agents.map((agent) => (
              <button key={agent.id} onClick={() => setFilterAgent(agent.id)} className={`px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all ${filterAgent === agent.id ? 'glass-strong text-white' : 'glass-subtle text-ink-400 hover:text-white'}`}>
                {agent.shortName}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-flex w-16 h-16 rounded-2xl glass-subtle items-center justify-center mb-4"><FileText size={28} className="text-ink-500" /></div>
            <h3 className="text-lg font-medium text-white mb-1">{t('documents.noDocumentsFound')}</h3>
            <p className="text-sm text-ink-400 mb-4">{search ? t('documents.tryDifferentSearch') : t('documents.uploadFirstDocument')}</p>
            <button onClick={() => setUploadOpen(true)} className="btn-glass"><Upload size={16} /> {t('documents.uploadDocument')}</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((doc, i) => {
              const agent = getAgent(doc.agentId);
              return (
                <div key={doc.id} className="glass rounded-2xl p-4 flex items-center gap-4 glass-hover animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="w-11 h-11 rounded-xl glass-subtle flex items-center justify-center shrink-0">{getDocIcon(doc.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate" title={doc.name}>{doc.name}</p>
                    <div className="flex items-center gap-2 mt-1"><span className="text-xs text-ink-500">{doc.size}</span>{doc.pages && <span className="text-xs text-ink-500">· {t('documents.pages', { count: doc.pages })}</span>}<span className="text-xs text-ink-500">· {agent.shortName}</span></div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {doc.status === 'ready' && <span className="flex items-center gap-1 text-xs text-success-400"><CheckCircle size={12} /> {t('documents.status.ready')}</span>}
                      {doc.status === 'processing' && <span className="flex items-center gap-1 text-xs text-warning-400"><Loader2 size={12} className="animate-spin" /> {t('documents.status.processing')}</span>}
                      {doc.status === 'error' && <span className="flex items-center gap-1 text-xs text-error-400"><AlertCircle size={12} /> {t('documents.status.error')}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {doc.status === 'ready' && <button onClick={() => void openPreview(doc)} className="p-2 rounded-lg text-ink-500 hover:bg-white/10 hover:text-white" title={t('documents.preview')}><Eye size={16} /></button>}
                    {doc.status !== 'processing' && <button onClick={() => void ragService.reindex(doc.id).then(() => setDocuments((prev) => prev.map((item) => item.id === doc.id ? { ...item, status: 'processing' } : item))).catch((err) => setError(err instanceof Error ? err.message : t('documents.errors.reindexFailed')))} className="p-2 rounded-lg text-ink-500 hover:bg-white/10 hover:text-white" title={t('documents.reindex')}><RefreshCw size={16} /></button>}
                    <button onClick={() => void handleDelete(doc.id)} className="p-2 rounded-lg text-ink-500 hover:bg-error-500/10 hover:text-error-400" title={t('documents.delete')}><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={uploadOpen} onClose={() => !uploading && setUploadOpen(false)} title={t('documents.uploadModalTitle')} maxWidth="max-w-lg">
        <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files); }} className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all ${dragOver ? 'border-primary-400/50 bg-primary-500/5' : 'border-white/10 glass-subtle'}`}>
          <div className="inline-flex w-14 h-14 rounded-2xl bg-primary-500/15 text-primary-400 items-center justify-center mb-4"><Upload size={26} /></div>
          <h3 className="text-base font-medium text-white mb-1">{t('documents.dragFilesHere')}</h3>
          <p className="text-sm text-ink-400 mb-4">{t('documents.orBrowse')}</p>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-primary">
            {uploading ? <><Loader2 size={16} className="animate-spin" /> {t('documents.uploading')}</> : t('documents.selectFiles')}
          </button>
          <input ref={fileInputRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => e.target.files && void handleFiles(e.target.files)} />
          <p className="text-xs text-ink-500 mt-4">{t('documents.supportsFormats', { size: 20 })}</p>
        </div>
        <div className="mt-4 flex items-center gap-2"><span className="text-xs text-ink-400">{t('documents.assignToAgent')}</span><div className="flex items-center gap-1.5"><AgentAvatar agent={getAgent(activeAgentId)} size="sm" /><span className="text-sm text-white">{getAgent(activeAgentId).name}</span></div></div>
      </Modal>

      <Modal open={!!previewDoc} onClose={() => setPreviewDoc(null)} title={previewDoc?.name ?? t('documents.previewDefaultTitle')} maxWidth="max-w-5xl">
        {previewDoc && (
          <div className="min-h-[300px]">
            {previewLoading && <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary-400" /></div>}
            {!previewLoading && isVisualPreview(previewDoc) && <iframe title={previewDoc.name} src={documentService.previewUrl(previewDoc.id)} className="w-full h-[65vh] rounded-xl bg-black border border-white/10" />}
            {!previewLoading && isPreviewableText(previewDoc) && <pre className="max-h-[65vh] overflow-auto rounded-xl bg-black/30 border border-white/10 p-5 text-sm text-ink-200 whitespace-pre-wrap">{textPreview}</pre>}
            {!previewLoading && !isVisualPreview(previewDoc) && !isPreviewableText(previewDoc) && (
              <div className="py-14 text-center"><File size={36} className="mx-auto mb-3 text-ink-500" /><p className="text-white font-medium">{t('documents.previewFallbackTitle')}</p><p className="text-sm text-ink-400 mt-1">{t('documents.previewFallbackDesc')}</p><a href={documentService.previewUrl(previewDoc.id)} target="_blank" rel="noreferrer" className="btn-primary inline-flex mt-5"><Download size={16} /> {t('documents.openFile')}</a></div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
