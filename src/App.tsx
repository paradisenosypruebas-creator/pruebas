import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Layout, 
  MessageSquare, 
  History as HistoryIcon, 
  Settings2, 
  Copy, 
  Check,
  RefreshCw,
  Image as ImageIcon,
  Video,
  Music,
  ChevronRight,
  PenTool,
  Target,
  Users,
  Zap,
  Trash2,
  Plus
} from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { geminiService } from './services/geminiService';
import { cn } from './lib/utils';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface Session {
  id: string;
  title: string;
  updated_at: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [history, setHistory] = useState<Session[]>([]);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    "Hook que detiene el scroll": false,
    "Conflicto o punto de dolor": false,
    "Transformación o solución": false,
    "Llamada a la acción clara": false,
    "Voz de marca coherente": false
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleChecklist = (item: string) => {
    setChecklist(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/sessions');
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const saveSession = async (currentMessages: Message[]) => {
    if (currentMessages.length === 0) return;
    
    // Use the first user message as title
    const firstUserMsg = currentMessages.find(m => m.role === 'user')?.content || 'Nuevo Proyecto';
    const title = firstUserMsg.length > 40 ? firstUserMsg.substring(0, 40) + '...' : firstUserMsg;

    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          title,
          messages: currentMessages
        })
      });
      fetchHistory();
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsGenerating(true);

    try {
      const historyForGemini = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      let fullResponse = '';
      const modelMsgIndex = newMessages.length;
      setMessages([...newMessages, { role: 'model', content: '' }]);

      const stream = geminiService.chatStream(userMessage, historyForGemini);
      
      for await (const chunk of stream) {
        if (chunk) {
          fullResponse += chunk;
          setMessages(prev => {
            const updated = [...prev];
            updated[modelMsgIndex] = { role: 'model', content: fullResponse };
            return updated;
          });
        }
      }
      
      // Save after completion
      await saveSession([...newMessages, { role: 'model', content: fullResponse }]);
    } catch (error) {
      console.error('Error generating content:', error);
      setMessages(prev => [...prev, { role: 'model', content: 'Lo siento, hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.' }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const createNewProject = () => {
    setMessages([]);
    setSessionId(crypto.randomUUID());
    setActiveTab('chat');
  };

  const loadSession = async (id: string) => {
    try {
      const response = await fetch(`/api/sessions/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        setSessionId(data.id);
        setActiveTab('chat');
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setHistory(prev => prev.filter(s => s.id !== id));
        if (sessionId === id) {
          createNewProject();
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-screen bg-[#F5F5F5] overflow-hidden font-sans">
      {/* Sidebar - Navigation */}
      <aside className="w-16 md:w-64 bg-black text-white flex flex-col border-r border-black/10">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#D91E5C] rounded-sm flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <span className="hidden md:block font-display font-bold text-xl tracking-tight">StoryCraft AI</span>
        </div>

        <nav className="flex-1 px-3 space-y-2 mt-4">
          <button 
            onClick={createNewProject}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all",
              activeTab === 'chat' && messages.length === 0 ? "bg-white/10 text-[#D91E5C]" : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <Plus className="w-5 h-5" />
            <span className="hidden md:block font-medium">Nuevo Proyecto</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all",
              activeTab === 'history' ? "bg-white/10 text-[#D91E5C]" : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <HistoryIcon className="w-5 h-5" />
            <span className="hidden md:block font-medium">Historial</span>
          </button>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="hidden md:block bg-white/5 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Sugerencias</h4>
            <div className="space-y-2">
              <button 
                onClick={() => setInput("Crea un carrusel para Instagram sobre los beneficios del storytelling emocional para marcas de lujo.")}
                className="text-xs text-left text-white/70 hover:text-[#D91E5C] transition-colors block"
              >
                "Beneficios del storytelling..."
              </button>
              <button 
                onClick={() => setInput("Escribe un post de LinkedIn contando mi historia de fracaso a éxito en el marketing digital.")}
                className="text-xs text-left text-white/70 hover:text-[#D91E5C] transition-colors block"
              >
                "Historia de fracaso a éxito..."
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <header className="h-16 border-b border-black/5 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-black/5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <Zap className="w-3 h-3 text-[#D91E5C]" />
              Modo Estratega Activo
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <Settings2 className="w-5 h-5 text-black/60" />
            </button>
          </div>
        </header>

        {/* Chat/Content View */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="w-full px-6 py-8">
            {activeTab === 'history' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-display font-bold">Tu Historial</h2>
                  <button onClick={createNewProject} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-black text-white px-4 py-2 rounded-full hover:bg-black/80 transition-all">
                    <Plus className="w-4 h-4" /> Nuevo Proyecto
                  </button>
                </div>
                
                {history.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed border-black/5 rounded-3xl">
                    <HistoryIcon className="w-12 h-12 text-black/10 mx-auto mb-4" />
                    <p className="text-black/40 font-medium">Aún no tienes proyectos guardados.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {history.map((session) => (
                      <div 
                        key={session.id}
                        onClick={() => loadSession(session.id)}
                        className={cn(
                          "group p-5 bg-white border border-black/5 rounded-2xl flex items-center justify-between cursor-pointer transition-all hover:border-black/20 hover:shadow-sm",
                          sessionId === session.id && "border-[#D91E5C] bg-[#D91E5C]/5"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-black/5 rounded-xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm mb-1">{session.title}</h3>
                            <p className="text-[10px] text-black/40 font-medium uppercase tracking-wider">
                              Actualizado: {new Date(session.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => deleteSession(e, session.id)}
                          className="p-2 text-black/20 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-20">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center shadow-2xl shadow-black/20"
                >
                  <PenTool className="w-10 h-10 text-[#D91E5C]" />
                </motion.div>
                <div className="space-y-4">
                  <h2 className="text-4xl font-display font-bold tracking-tight">¿Qué historia vamos a contar hoy?</h2>
                  <p className="text-black/50 max-w-md mx-auto">
                    Transforma tus ideas en narrativas persuasivas que conectan y convierten. Cuéntame sobre tu marca, tu objetivo o tu audiencia.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                  {[
                    { 
                      icon: Target, 
                      title: "Objetivo Claro", 
                      desc: "Vender, educar o conectar.",
                      prompt: "Ayúdame a definir el objetivo de mi próximo contenido. Mi producto/servicio es: "
                    },
                    { 
                      icon: Users, 
                      title: "Audiencia Ideal", 
                      desc: "Hablamos su mismo idioma.",
                      prompt: "Quiero definir mi audiencia ideal para: "
                    },
                    { 
                      icon: Layout, 
                      title: "Multi-formato", 
                      desc: "Reels, carruseles, blogs y más.",
                      prompt: "Necesito adaptar una idea a diferentes formatos (Reel, Carrusel, Post). La idea es: "
                    },
                    { 
                      icon: Sparkles, 
                      title: "Magia Narrativa", 
                      desc: "Hooks que atrapan al instante.",
                      prompt: "Genera 5 hooks impactantes para un contenido sobre: "
                    }
                  ].map((item, i) => (
                    <button 
                      key={i} 
                      onClick={() => setInput(item.prompt)}
                      className="p-4 border border-black/5 rounded-2xl hover:border-black/20 hover:bg-black/[0.02] transition-all group text-left"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <item.icon className="w-5 h-5 text-black group-hover:text-[#D91E5C] transition-colors" />
                        <h3 className="font-bold text-sm">{item.title}</h3>
                      </div>
                      <p className="text-xs text-black/40">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8 pb-12">
                {messages.map((message, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-4",
                      message.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      message.role === 'user' ? "bg-black text-white" : "bg-[#D91E5C] text-black"
                    )}>
                      {message.role === 'user' ? <Users className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    </div>
                    <div className={cn(
                      "flex-1 space-y-2",
                      message.role === 'user' ? "items-end" : "items-start"
                    )}>
                      <div className={cn(
                        "p-5 rounded-2xl shadow-sm",
                        message.role === 'user' 
                          ? "bg-black text-white rounded-tr-none" 
                          : "bg-white border border-black/5 rounded-tl-none"
                      )}>
                        <div className={cn(
                          "markdown-body",
                          message.role === 'user' ? "text-white" : "text-black"
                        )}>
                          <Markdown>{message.content}</Markdown>
                        </div>
                      </div>
                      
                      {message.role === 'model' && message.content && (
                        <div className="flex items-center gap-2 px-2">
                          <button 
                            onClick={() => copyToClipboard(message.content)}
                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-black/40 hover:text-black transition-colors"
                          >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? 'Copiado' : 'Copiar Texto'}
                          </button>
                          <div className="w-1 h-1 bg-black/10 rounded-full" />
                          <button className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-black/40 hover:text-black transition-colors">
                            <RefreshCw className="w-3 h-3" />
                            Regenerar
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {isGenerating && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-[#D91E5C] rounded-full flex items-center justify-center animate-pulse">
                      <Sparkles className="w-4 h-4 text-black" />
                    </div>
                    <div className="bg-white border border-black/5 p-5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        {activeTab === 'chat' && (
          <div className="p-6 bg-white border-t border-black/5">
            <div className="w-full relative">
              <div className="absolute -top-10 left-0 flex gap-2 overflow-x-auto pb-2 no-scrollbar max-w-full">
                <button 
                  onClick={() => setInput("Escribe un hook para un Reel sobre...")}
                  className="whitespace-nowrap px-3 py-1 bg-black/5 hover:bg-black/10 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors"
                >
                  🪝 Hooks
                </button>
                <button 
                  onClick={() => setInput("Dame ideas de imágenes para un carrusel de...")}
                  className="whitespace-nowrap px-3 py-1 bg-black/5 hover:bg-black/10 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors"
                >
                  🖼️ Visuales
                </button>
                <button 
                  onClick={() => setInput("Crea un CTA persuasivo para una landing page de...")}
                  className="whitespace-nowrap px-3 py-1 bg-black/5 hover:bg-black/10 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors"
                >
                  🎯 CTAs
                </button>
              </div>
              
              <div className="relative group">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Describe tu marca, producto o idea..."
                  className="w-full bg-[#F5F5F5] border border-black/5 rounded-2xl px-6 py-4 pr-16 focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all resize-none min-h-[60px] max-h-[200px]"
                  rows={1}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isGenerating}
                  className={cn(
                    "absolute right-3 bottom-3 p-2 rounded-xl transition-all",
                    input.trim() && !isGenerating 
                      ? "bg-black text-white hover:scale-105 active:scale-95" 
                      : "bg-black/10 text-black/20 cursor-not-allowed"
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-3 text-[10px] text-center text-black/30 font-medium uppercase tracking-widest">
                StoryCraft AI v1.0 • Impulsado por Gemini 3.1 Pro
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Right Panel - Context/Tools (Hidden on mobile) */}
      <aside className="hidden xl:flex w-80 bg-[#F5F5F5] flex-col border-l border-black/10">
        <div className="p-6 border-b border-black/10">
          <h3 className="font-display font-bold text-lg mb-1">Herramientas</h3>
          <p className="text-xs text-black/40">Recursos creativos adicionales</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-black/40">Formatos Rápidos</h4>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => {
                  setActiveTab('chat');
                  setInput("Escribe un guion para un Reel de 30-60 segundos sobre: ");
                }}
                className="p-3 bg-white border border-black/5 rounded-xl hover:border-[#D91E5C] transition-all text-left space-y-2 group"
              >
                <Video className="w-4 h-4 text-black/40 group-hover:text-[#D91E5C]" />
                <span className="block text-[10px] font-bold uppercase">Reel Script</span>
              </button>
              <button 
                onClick={() => {
                  setActiveTab('chat');
                  setInput("Diseña la estructura de un carrusel de 7 slides para Instagram sobre: ");
                }}
                className="p-3 bg-white border border-black/5 rounded-xl hover:border-[#D91E5C] transition-all text-left space-y-2 group"
              >
                <Layout className="w-4 h-4 text-black/40 group-hover:text-[#D91E5C]" />
                <span className="block text-[10px] font-bold uppercase">Carrusel</span>
              </button>
              <button 
                onClick={() => {
                  setActiveTab('chat');
                  setInput("Escribe un post único (single post) con un storytelling potente sobre: ");
                }}
                className="p-3 bg-white border border-black/5 rounded-xl hover:border-[#D91E5C] transition-all text-left space-y-2 group"
              >
                <ImageIcon className="w-4 h-4 text-black/40 group-hover:text-[#D91E5C]" />
                <span className="block text-[10px] font-bold uppercase">Single Post</span>
              </button>
              <button 
                onClick={() => {
                  setActiveTab('chat');
                  setInput("Sugiere 3 opciones de música o sonidos de tendencia y cómo usarlos para un contenido sobre: ");
                }}
                className="p-3 bg-white border border-black/5 rounded-xl hover:border-[#D91E5C] transition-all text-left space-y-2 group"
              >
                <Music className="w-4 h-4 text-black/40 group-hover:text-[#D91E5C]" />
                <span className="block text-[10px] font-bold uppercase">Audio/Música</span>
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-black/40">Checklist de Storytelling</h4>
            <div className="space-y-3">
              {Object.keys(checklist).map((item, i) => (
                <button 
                  key={i} 
                  onClick={() => toggleChecklist(item)}
                  className="flex items-center gap-3 w-full text-left group"
                >
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-all",
                    checklist[item] ? "bg-[#D91E5C] border-[#D91E5C]" : "border-black/20"
                  )}>
                    {checklist[item] && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={cn(
                    "text-xs transition-all",
                    checklist[item] ? "text-black font-medium" : "text-black/60"
                  )}>{item}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="p-4 bg-black rounded-2xl text-white space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#D91E5C]">Pro Tip</h4>
              <Sparkles className="w-3 h-3 text-[#D91E5C]" />
            </div>
            <p className="text-[11px] leading-relaxed text-white/80">
              Usa el **Storytelling de Ficción** para crear escenarios hipotéticos que resalten los beneficios de tu producto de forma creativa.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
