import React, { useRef, useEffect, useState } from 'react';
import { 
  Send, 
  Sparkles, 
  RefreshCw, 
  AlertCircle,
  HelpCircle,
  User,
  Flame,
  Plane,
  Luggage,
  CalendarDays,
  Gem
} from 'lucide-react';
import { Message, FlightSearchFormState } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onClearHistory: () => void;
  formState: FlightSearchFormState;
  onFormChange: (updater: (prev: FlightSearchFormState) => FlightSearchFormState) => void;
}

export default function ChatInterface({ 
  messages, 
  isLoading, 
  onSendMessage, 
  onClearHistory,
  formState,
  onFormChange
}: ChatInterfaceProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText('');
  };

  // Quick suggestion button handlers
  const handleSuggestionClick = (type: string) => {
    switch (type) {
      case 'povratna':
        onFormChange((prev) => ({
          ...prev,
          dates: { ...prev.dates, tripType: 'round-trip' }
        }));
        break;
      case 'enosmerna':
        onFormChange((prev) => ({
          ...prev,
          dates: { ...prev.dates, tripType: 'one-way', returnDate: null }
        }));
        break;
      case 'economy':
        onFormChange((prev) => ({
          ...prev,
          passengers: { ...prev.passengers, cabinClass: 'economy' }
        }));
        break;
      case 'business':
        onFormChange((prev) => ({
          ...prev,
          passengers: { ...prev.passengers, cabinClass: 'business' }
        }));
        break;
      case 'plusminus2':
        onFormChange((prev) => ({
          ...prev,
          flexibility: { ...prev.flexibility, flexibleDays: 2 }
        }));
        break;
      case 'carryon':
        onFormChange((prev) => ({
          ...prev,
          flexibility: { ...prev.flexibility, carryOnOnly: !prev.flexibility.carryOnOnly }
        }));
        break;
      default:
        break;
    }
  };

  // Status checks to highlight suggestions based on form state
  const isPovratnaActive = formState.dates.tripType === 'round-trip';
  const isEnosmernaActive = formState.dates.tripType === 'one-way';
  const isEconomyActive = formState.passengers.cabinClass === 'economy';
  const isBusinessActive = formState.passengers.cabinClass === 'business';
  const isPlusMinus2Active = formState.flexibility.flexibleDays === 2;
  const isCarryOnActive = formState.flexibility.carryOnOnly;

  return (
    <div id="chat-interface" className="flex flex-col h-[650px] lg:h-[700px] glass rounded-3xl overflow-hidden border-white/55 shadow-xl">
      
      {/* Chat Header */}
      <div className="bg-slate-900/95 backdrop-blur text-white px-6 py-4 flex items-center justify-between shadow-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Plane className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-0.5">
                SkyBot <span className="text-blue-400 italic font-extrabold">AI</span>
              </h3>
              <span className="text-[9px] bg-blue-500/30 text-blue-200 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                n8n Live
              </span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block -mt-0.5">Letalski pomočnik</p>
          </div>
        </div>
        
        <button
          type="button"
          onClick={onClearHistory}
          title="Počisti zgodovino"
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors text-xs flex items-center gap-1 font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Počisti</span>
        </button>
      </div>

      {/* Connection Mode Warning */}
      <div className="bg-blue-100/50 backdrop-blur border-b border-white/30 px-5 py-2.5 text-xs text-blue-900 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 animate-pulse" />
        <span className="font-semibold truncate">
          Sinhronizirano s parametri: spreminjanje forme takoj posodobi naslednje poizvedbe.
        </span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4 bg-slate-100/20 backdrop-blur">
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';
          return (
            <div 
              key={msg.id} 
              className={`flex w-full ${isBot ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`flex items-end gap-2.5 max-w-[85%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                {/* Avatar Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md border ${
                  isBot 
                    ? 'bg-blue-600 text-white border-blue-400/30' 
                    : 'bg-white text-indigo-700 border-slate-205'
                }`}>
                  {isBot ? (
                    <span className="text-[9px] font-bold">SB</span>
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>

                {/* Bubble Container */}
                <div className="space-y-1">
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm transition-all ${
                    isBot 
                      ? msg.isError
                        ? 'bg-red-50 text-red-900 border-l-4 border-red-500 rounded-bl-xs font-semibold'
                        : 'bg-white/95 text-slate-800 border border-slate-150/70 rounded-bl-xs' 
                      : 'bg-blue-600 text-white rounded-br-xs shadow-md shadow-blue-500/10'
                  }`}>
                    {/* Render message output */}
                    <p className="whitespace-pre-line font-medium">{msg.text}</p>
                    
                    {/* Helpful hint for CORS if it's an error message */}
                    {isBot && msg.isError && (
                      <div className="mt-3.5 pt-2 border-t border-red-200/50 text-[11px] text-red-650 space-y-1">
                        <p className="font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Tehnični nasvet glede CORS:
                        </p>
                        <p className="font-medium text-slate-650 leading-relaxed">
                          N8n lahko povzroča CORS zavrnitve, če glave niso nastavljene na <code>Access-Control-Allow-Origin: *</code>. Če se to zgodi, bo integracija delovala preko obratnega proxy-ja ali ustreznih n8n CORS nastavitev v vaši instanci.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <div className={`text-[9px] text-slate-400 font-bold tracking-tight px-1 ${
                    !isBot ? 'text-right' : 'text-left'
                  }`}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading / Typing Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-end gap-2.5 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Plane className="w-4 h-4 animate-spin" />
              </div>
              <div className="space-y-1">
                <div className="px-4 py-3 rounded-2xl bg-white/95 text-slate-800 border border-slate-100 rounded-bl-xs shadow-sm flex items-center gap-2">
                  <div className="flex space-x-1.5 items-center">
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 ml-1">Potovalni asistent išče možnosti...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Anchor point to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions and Text Input Panel */}
      <div className="p-4 bg-white/70 backdrop-blur border-t border-white/40 space-y-3">
        
        {/* Quick Suggestion Tags */}
        <div className="text-[11px] text-slate-400 font-bold tracking-wide uppercase px-1 flex items-center gap-1">
          <span>Hitri predlogi:</span>
          <span className="text-[10px] text-slate-400 lowercase font-semibold normal-case">(posodobi formo podatkov)</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
          <button
            type="button"
            onClick={() => handleSuggestionClick('povratna')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
              isPovratnaActive 
                ? 'bg-blue-650 text-white border-blue-650' 
                : 'bg-white/85 text-slate-650 border-slate-200/80 hover:border-blue-400 hover:text-blue-705'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
            Povratna karta
          </button>

          <button
            type="button"
            onClick={() => handleSuggestionClick('enosmerna')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
              isEnosmernaActive 
                ? 'bg-blue-650 text-white border-blue-650' 
                : 'bg-white/85 text-slate-650 border-slate-200/80 hover:border-blue-400 hover:text-blue-705'
            }`}
          >
            <Plane className="w-3.5 h-3.5 text-blue-500" />
            Enosmerna karta
          </button>

          <button
            type="button"
            onClick={() => handleSuggestionClick('economy')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
              isEconomyActive 
                ? 'bg-blue-650 text-white border-blue-650' 
                : 'bg-white/85 text-slate-650 border-slate-200/80 hover:border-blue-400 hover:text-blue-705'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-blue-500" />
            Economy razred
          </button>

          <button
            type="button"
            onClick={() => handleSuggestionClick('business')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
              isBusinessActive 
                ? 'bg-blue-650 text-white border-blue-650' 
                : 'bg-white/85 text-slate-650 border-slate-200/80 hover:border-blue-400 hover:text-blue-705'
            }`}
          >
            <Gem className="w-3.5 h-3.5 text-blue-500" />
            Business razred
          </button>

          <button
            type="button"
            onClick={() => handleSuggestionClick('plusminus2')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
              isPlusMinus2Active 
                ? 'bg-blue-650 text-white border-blue-650' 
                : 'bg-white/85 text-slate-650 border-slate-200/80 hover:border-blue-400 hover:text-blue-705'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
            ± 2 dni
          </button>

          <button
            type="button"
            onClick={() => handleSuggestionClick('carryon')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
              isCarryOnActive 
                ? 'bg-blue-650 text-white border-blue-650' 
                : 'bg-white/85 text-slate-650 border-slate-200/80 hover:border-blue-400 hover:text-blue-705'
            }`}
          >
            <Luggage className="w-3.5 h-3.5 text-blue-500" />
            Samo ročna prtljaga
          </button>
        </div>

        {/* Text Area Form Input */}
        <div className="pt-2 border-t border-slate-200/40">
          <form onSubmit={handleSend} className="bg-white/90 border border-slate-200 rounded-2xl p-1.5 flex items-center shadow-inner transition-all focus-within:ring-2 focus-within:ring-blue-100">
            <input
              id="chat-message-input"
              type="text"
              required
              placeholder="Vprašajte me karkoli o letih..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none px-4 text-sm font-semibold text-slate-700 placeholder-slate-400"
            />
            <button
              id="chat-send-btn"
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                !inputText.trim() || isLoading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-500/10'
              }`}
              title="Pošlji sporočilo"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>
          <p className="text-[10px] text-center text-slate-400 mt-2 font-bold uppercase tracking-wider">
            Povezano z n8n AI Engine • Session: {messages.length > 0 ? messages[0].id.substring(0, 10) : 'sky_8291'}
          </p>
        </div>
      </div>

    </div>
  );
}
