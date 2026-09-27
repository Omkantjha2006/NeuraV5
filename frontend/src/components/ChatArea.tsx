import { Fragment, useState, useRef, useEffect, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { useApp } from '@/store/AppContext';
import { useTranslation } from '@/i18n/I18nContext';
import { AgentAvatar } from '@/components/AgentAvatar';
import {
  Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, Share2,
  Edit3, Send, AlertCircle, Pencil, RotateCw, Trash2, Globe2,
} from 'lucide-react';
import type { Message } from '@/types';

function formatTime(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Markdown inline syntax used by Gemini responses. React renders the result
  // as elements, so raw HTML from model output is never injected into the DOM.
  const pattern = /(\*\*|__)(.+?)\1|(?<!\*)\*([^*\n]+?)\*(?!\*)|(?<!_)_([^_\n]+?)_(?!_)|`([^`\n]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/;

  while (remaining) {
    const match = pattern.exec(remaining);
    if (!match) {
      nodes.push(<Fragment key={key++}>{remaining}</Fragment>);
      break;
    }

    if (match.index > 0) {
      nodes.push(<Fragment key={key++}>{remaining.slice(0, match.index)}</Fragment>);
    }

    if (match[2] !== undefined) {
      nodes.push(<strong key={key++} className="font-semibold text-white">{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      nodes.push(<em key={key++}>{match[3]}</em>);
    } else if (match[4] !== undefined) {
      nodes.push(<em key={key++}>{match[4]}</em>);
    } else if (match[5] !== undefined) {
      nodes.push(
        <code key={key++} className="rounded bg-white/10 px-1.5 py-0.5 text-[0.9em] text-primary-200">
          {match[5]}
        </code>
      );
    } else if (match[6] !== undefined && match[7] !== undefined) {
      nodes.push(
        <a
          key={key++}
          href={match[7]}
          target="_blank"
          rel="noreferrer"
          className="text-primary-300 underline underline-offset-2 hover:text-primary-200"
        >
          {match[6]}
        </a>
      );
    }

    remaining = remaining.slice(match.index + match[0].length);
  }

  return nodes;
}

function renderTextLine(line: string, key: string): ReactNode {
  return <Fragment key={key}>{renderInline(line)}</Fragment>;
}

function renderContent(content: string): ReactNode {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let codeLines: string[] | null = null;
  let codeLang = '';
  let blockKey = 0;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(
      <p key={`p-${blockKey++}`} className="mb-3 last:mb-0 whitespace-pre-wrap leading-relaxed">
        {paragraph.map((line, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {renderTextLine(line, `line-${i}`)}
          </Fragment>
        ))}
      </p>
    );
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length || !listType) return;
    const Tag = listType;
    blocks.push(
      <Tag key={`list-${blockKey++}`} className={`mb-3 pl-6 space-y-1.5 leading-relaxed ${listType === 'ol' ? 'list-decimal' : 'list-disc'}`}>
        {listItems.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </Tag>
    );
    listItems = [];
    listType = null;
  };

  const flushCode = () => {
    if (codeLines === null) return;
    blocks.push(
      <CodeBlock key={`code-${blockKey++}`} code={codeLines.join('\n').replace(/\n$/, '')} lang={codeLang || 'text'} />
    );
    codeLines = null;
    codeLang = '';
  };

  for (const line of lines) {
    const fence = line.match(/^\s*```\s*([\w+-]*)\s*$/);
    if (fence) {
      flushParagraph();
      flushList();
      if (codeLines === null) {
        codeLines = [];
        codeLang = fence[1] || 'text';
      } else {
        flushCode();
      }
      continue;
    }

    if (codeLines !== null) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1].length, 6);
      const Tag = (`h${level}`) as keyof JSX.IntrinsicElements;
      const sizes: Record<number, string> = {
        1: 'text-2xl font-bold',
        2: 'text-xl font-bold',
        3: 'text-lg font-semibold',
        4: 'text-base font-semibold',
        5: 'text-sm font-semibold',
        6: 'text-sm font-medium',
      };
      blocks.push(
        <Tag key={`h-${blockKey++}`} className={`${sizes[level]} mt-4 mb-2 text-white`}>
          {renderInline(heading[2])}
        </Tag>
      );
      continue;
    }

    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push(<hr key={`hr-${blockKey++}`} className="my-4 border-white/10" />);
      continue;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const nextType = unordered ? 'ul' : 'ol';
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((unordered ?? ordered)![1]);
      continue;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      blocks.push(
        <blockquote key={`quote-${blockKey++}`} className="my-3 border-l-2 border-primary-400/50 pl-4 text-ink-300 italic">
          {renderInline(quote[1])}
        </blockquote>
      );
      continue;
    }

    // A normal line ends a list before starting the next paragraph.
    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  flushCode();

  return <div className="markdown-content">{blocks}</div>;
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-white/5">
      <div className="flex items-center justify-between bg-ink-950/60 px-3 py-1.5 border-b border-white/5">
        <span className="text-xs text-ink-500 font-mono">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-ink-400 hover:text-white transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? t('chat.copied') : t('chat.copy')}
        </button>
      </div>
      <pre className="code-block !rounded-none !border-0 !my-0">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MessageActions({ message }: { message: Message }) {
  const { regenerateLast, deleteMessage, setMessageFeedback } = useApp();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(message.feedback ?? null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: message.content });
        return;
      } catch (err) {
        // User cancelled the native share sheet — do nothing.
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Any other failure (e.g. share API present but rejected the payload) falls through to copy below.
      }
    }
    // No native share support (most desktop browsers): copy to clipboard instead.
    handleCopy();
  };

  if (message.isStreaming) return null;

  const updateFeedback = async (next: 'positive' | 'negative') => {
    const value = feedback === next ? null : next;
    setFeedback(value);
    await setMessageFeedback(message.id, value);
  };

  const actions = [
    { icon: copied ? <Check size={14} /> : <Copy size={14} />, label: t('chat.copy'), onClick: handleCopy },
    { icon: <RefreshCw size={14} />, label: message.isError ? t('chat.retry') : t('chat.regenerate'), onClick: regenerateLast },
    { icon: <ThumbsUp size={14} />, label: t('chat.like'), onClick: () => void updateFeedback('positive'), active: feedback === 'positive' },
    { icon: <ThumbsDown size={14} />, label: t('chat.dislike'), onClick: () => void updateFeedback('negative'), active: feedback === 'negative' },
    { icon: <Share2 size={14} />, label: t('chat.share'), onClick: () => void handleShare() },
    { icon: <Trash2 size={14} />, label: t('chat.delete'), onClick: () => void deleteMessage(message.id) },
  ];

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
      {actions.map((a, i) => (
        <button key={i} onClick={a.onClick} title={a.label}
          className={`p-1.5 rounded-md transition-colors ${a.active ? 'text-primary-400 bg-primary-500/10' : 'text-ink-500 hover:text-white hover:bg-white/10'}`}>
          {a.icon}
        </button>
      ))}
    </div>
  );
}

function UserMessageActions({ message }: { message: Message }) {
  const { editMessage, deleteMessage, isGenerating } = useApp();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);

  if (editing) {
    return (
      <div className="mt-2">
        <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)}
          className="input-glass text-sm min-h-[60px] resize-none" autoFocus />
        <div className="flex gap-2 mt-2">
          <button onClick={async () => {
            const value = editValue.trim();
            if (value && value !== message.content) await editMessage(message.id, value);
            setEditing(false);
          }} className="btn-primary text-xs py-1.5 px-3" disabled={isGenerating || !editValue.trim()}>
            <Send size={12} />
            {t('chat.saveAndRegenerate')}
          </button>
          <button onClick={() => setEditing(false)} className="btn-ghost text-xs py-1.5 px-3">{t('chat.cancel')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={() => setEditing(true)} title={t('chat.edit')} className="p-1.5 rounded-md text-ink-500 hover:text-white hover:bg-white/10 transition-colors">
        <Pencil size={14} />
      </button>
      <button onClick={() => void deleteMessage(message.id)} title={t('chat.delete')} className="p-1.5 rounded-md text-ink-500 hover:text-error-400 hover:bg-white/10 transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const { getAgent } = useApp();
  const { t, language } = useTranslation();
  const agent = message.agentId ? getAgent(message.agentId) : null;

  if (isUser) {
    return (
      <div className="group flex justify-end animate-fade-in-up">
        <div className="max-w-[80%] flex flex-col items-end">
          <div className="rounded-2xl rounded-tr-md bg-primary-600/30 border border-primary-500/20 px-4 py-3">
            <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{message.content}</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-ink-500">{formatTime(message.createdAt, language)}</span>
            <UserMessageActions message={message} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-3 animate-fade-in-up">
      {agent && <AgentAvatar agent={agent} size="sm" />}
      <div className="max-w-[80%] flex-1">
        <div className={`rounded-2xl rounded-tl-md px-4 py-3 ${
          message.isError
            ? 'bg-error-500/10 border border-error-500/20'
            : 'glass-subtle'
        }`}>
          {message.isError && (
            <div className="flex items-center gap-2 mb-2 text-error-400">
              <AlertCircle size={16} />
              <span className="text-sm font-medium">{t('chat.error')}</span>
            </div>
          )}
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-1.5 py-1">
              <span className="typing-dot text-primary-400" />
              <span className="typing-dot text-primary-400" style={{ animationDelay: '0.2s' }} />
              <span className="typing-dot text-primary-400" style={{ animationDelay: '0.4s' }} />
            </div>
          ) : (
            <div className="text-sm text-ink-100 whitespace-pre-wrap leading-relaxed">
              {renderContent(message.content)}
              {message.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-primary-400 ml-0.5 animate-pulse-soft align-middle" />
              )}
            </div>
          )}
          {!message.isStreaming && message.metadata?.webSources?.length ? (
            <WebSources sources={message.metadata.webSources} />
          ) : null}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-ink-500">{formatTime(message.createdAt, language)}</span>
          <MessageActions message={message} />
        </div>
      </div>
    </div>
  );
}

type SpeechRecognitionResultLike = {
  0?: { transcript?: string };
  isFinal?: boolean;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
  error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;


function WebSources({ sources }: { sources: NonNullable<Message['metadata']>['webSources'] }) {
  const { t } = useTranslation();
  if (!sources?.length) return null;
  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-300 mb-2">
        <Globe2 size={13} className="text-primary-300" />
        {t('chat.webSources')}
      </div>
      <div className="space-y-1.5">
        {sources.slice(0, 8).map((source, index) => (
          <a
            key={source.id || source.url}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-2 transition-colors"
          >
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-primary-300 mt-0.5">[{index + 1}]</span>
              <div className="min-w-0">
                <p className="text-xs text-white truncate">{source.title}</p>
                <p className="text-[10px] text-ink-500 truncate">{source.domain || source.url}</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export function ChatArea() {
  const { messages, isGenerating, sendMessage, stopGeneration, activeConversation, activeAgentId, regenerateLast, getAgent, navigate } = useApp();
  const { t, td, language } = useTranslation();
  const [input, setInput] = useState('');
  const [webResearch, setWebResearch] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;
    sendMessage(input.trim(), { webResearch });
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoice = () => {
    setVoiceError('');
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition as SpeechRecognitionConstructor | undefined;
    if (!SpeechRecognition) {
      setVoiceError(t('chat.speechNotSupported'));
      return;
    }

      const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript ?? '';
        if (result && 'isFinal' in result && result.isFinal) finalText += transcript;
      }
      if (finalText.trim()) {
        setInput((current) => `${current}${current.trim() ? ' ' : ''}${finalText.trim()}`);
      }
    };
    recognition.onerror = (event: { error?: string }) => {
      if (event.error !== 'aborted') setVoiceError(t('chat.voiceInputError', { error: event.error || t('chat.unknownError') }));
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setVoiceError(t('chat.micPermissionError'));
      setIsListening(false);
    }
  };

  useEffect(() => () => { recognitionRef.current?.stop(); }, []);

  // Empty state
  if (!activeConversation || messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-2xl">
            <div className="inline-block mb-6 animate-fade-in">
              <AgentAvatar agent={getAgent(activeAgentId)} size="lg" active />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 animate-fade-in-up">
              {getAgent(activeAgentId).name}
            </h2>
            <p className="text-ink-400 mb-8 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
              {getAgent(activeAgentId).description}
            </p>
            <div className="flex flex-wrap gap-2 justify-center animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              {getAgent(activeAgentId).capabilities.map((cap) => (
                <span key={cap} className="glass-subtle rounded-full px-3 py-1.5 text-sm text-ink-300">
                  {cap}
                </span>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
              {td<{ title: string; subtitle: string }[]>(`chat.suggestions.${activeAgentId}`)?.slice(0, 4).map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s.title)}
                  className="glass rounded-xl p-4 text-left glass-hover group"
                >
                  <p className="text-sm text-white font-medium mb-1">{s.title}</p>
                  <p className="text-xs text-ink-400">{s.subtitle}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <ChatInput
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          handleKeyDown={handleKeyDown}
          isGenerating={isGenerating}
          stopGeneration={stopGeneration}
          isListening={isListening}
          toggleVoice={toggleVoice}
          voiceError={voiceError}
          textareaRef={textareaRef}
          webResearch={webResearch}
          setWebResearch={setWebResearch}
          onAttachClick={() => navigate('documents')}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isGenerating && (
          <div className="flex justify-center">
            <button
              onClick={stopGeneration}
              className="flex items-center gap-2 glass rounded-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors animate-fade-in"
            >
              <span className="w-2.5 h-2.5 rounded-sm bg-error-400" />
              {t('chat.stopGenerating')}
            </button>
          </div>
        )}
      </div>

      <ChatInput
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        handleKeyDown={handleKeyDown}
        isGenerating={isGenerating}
        stopGeneration={stopGeneration}
        isListening={isListening}
        toggleVoice={toggleVoice}
        voiceError={voiceError}
        textareaRef={textareaRef}
        webResearch={webResearch}
        setWebResearch={setWebResearch}
        onAttachClick={() => navigate('documents')}
      />
    </div>
  );
}

interface ChatInputProps {
  input: string;
  setInput: (v: string) => void;
  handleSend: () => void;
  handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  isGenerating: boolean;
  stopGeneration: () => void;
  isListening: boolean;
  toggleVoice: () => void;
  voiceError: string;
  textareaRef: RefObject<HTMLTextAreaElement>;
  webResearch: boolean;
  setWebResearch: (value: boolean) => void;
  onAttachClick: () => void;
}

function ChatInput({
  input, setInput, handleSend, handleKeyDown,
  isGenerating, stopGeneration, isListening, toggleVoice, voiceError, textareaRef,
  webResearch, setWebResearch, onAttachClick,
}: ChatInputProps) {
  const { t } = useTranslation();
  const canSend = input.trim().length > 0 && !isGenerating;

  return (
    <div className="shrink-0 px-4 md:px-6 pb-4 pt-2 safe-bottom safe-left safe-right">
      <div className="max-w-3xl mx-auto">
        {isListening && (
          <div className="glass rounded-xl px-4 py-2 mb-2 flex items-center gap-3 animate-fade-in">
            <div className="flex items-center gap-1 flex-1">
              {[4, 8, 12, 8, 14, 10, 6, 12, 8, 4, 10, 6].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-error-400 rounded-full animate-pulse-soft"
                  style={{ height: `${h * 2}px`, animationDelay: `${i * 0.08}s` }}
                />
              ))}
            </div>
            <span className="text-xs text-error-300">{t('chat.listening')}</span>
            <button onClick={toggleVoice} className="text-xs text-ink-400 hover:text-white">{t('chat.stop')}</button>
          </div>
        )}

        {webResearch && !isGenerating && (
          <div className="mb-2 flex items-center gap-2 text-xs text-primary-300">
            <Globe2 size={13} />
            {t('chat.webResearchEnabledNote')}
          </div>
        )}

        {voiceError && (
          <div className="mb-2 rounded-lg bg-error-500/10 border border-error-500/20 px-3 py-2 text-xs text-error-300">{voiceError}</div>
        )}

        <div className={`glass-strong rounded-2xl p-2 flex items-end gap-2 transition-all ${isGenerating ? 'opacity-70' : ''}`}>
          {/* Web research */}
          <button
            onClick={() => setWebResearch(!webResearch)}
            disabled={isGenerating}
            className={`p-2.5 rounded-xl transition-colors shrink-0 ${
              webResearch
                ? 'text-primary-300 bg-primary-500/15'
                : 'text-ink-400 hover:bg-white/10 hover:text-white'
            }`}
            title={webResearch ? t('chat.webResearchEnabled') : t('chat.enableWebResearch')}
          >
            <Globe2 size={19} />
          </button>

          {/* Attachment — chat has no file-upload backend yet, so this opens the
              existing (working) Documents page instead of pretending to attach
              a file to the conversation. */}
          <button
            onClick={onAttachClick}
            disabled={isGenerating}
            className="p-2.5 rounded-xl text-ink-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
            title={t('chat.attachFile')}
          >
            <PaperclipIcon />
          </button>

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.messagePlaceholder')}
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-ink-500 focus:outline-none resize-none py-2.5 min-h-[20px] max-h-[200px]"
            disabled={isGenerating}
          />

          {/* Voice input */}
          <button
            onClick={toggleVoice}
            className={`p-2.5 rounded-xl transition-colors shrink-0 ${
              isListening
                ? 'text-error-400 bg-error-500/10 animate-pulse-soft'
                : 'text-ink-400 hover:bg-white/10 hover:text-white'
            }`}
            title={t('chat.voiceInput')}
          >
            <MicIcon />
          </button>

          {/* Send / Stop */}
          {isGenerating ? (
            <button
              onClick={stopGeneration}
              className="p-2.5 rounded-xl bg-error-500/20 text-error-400 hover:bg-error-500/30 transition-colors shrink-0"
              title={t('chat.stop')}
            >
              <span className="block w-3.5 h-3.5 bg-error-400 rounded-sm" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="p-2.5 rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:bg-white/5 disabled:text-ink-600 transition-all shrink-0 active:scale-95"
              title={t('chat.send')}
            >
              <Send size={18} />
            </button>
          )}
        </div>

        <p className="text-center text-xs text-ink-600 mt-2">
          {t('chat.pressEnterToSend', {
            enter: '␊ENTERKEY␊',
            shiftEnter: '␊SHIFTKEY␊',
          }).split('␊').map((part, i) => {
            if (part === 'ENTERKEY') return <kbd key={i} className="px-1.5 py-0.5 glass-subtle rounded text-ink-400 font-mono text-[10px]">{t('chat.enterKey')}</kbd>;
            if (part === 'SHIFTKEY') return <kbd key={i} className="px-1.5 py-0.5 glass-subtle rounded text-ink-400 font-mono text-[10px]">{t('chat.shiftEnterKey')}</kbd>;
            return <Fragment key={i}>{part}</Fragment>;
          })}
        </p>
      </div>
    </div>
  );
}

function PaperclipIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
