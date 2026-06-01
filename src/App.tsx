import React, { useState, useEffect } from 'react';
import { 
  Plane, 
  MapPin, 
  HelpCircle, 
  Settings, 
  Database, 
  CheckCircle2, 
  ChevronRight, 
  Smartphone, 
  Monitor, 
  Info,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import FlightForm from './components/FlightForm';
import ChatInterface from './components/ChatInterface';
import { FlightSearchFormState, Message, MessagePayload } from './types';

const WEBHOOK_URL = '/api/chat-proxy';

const DEFAULT_FORM_STATE: FlightSearchFormState = {
  route: {
    originCity: '',
    destinationCity: '',
  },
  dates: {
    outboundDate: '',
    returnDate: null,
    tripType: 'round-trip',
  },
  passengers: {
    numberOfPassengers: 1,
    cabinClass: 'economy',
  },
  flexibility: {
    flexibleDays: 0,
    willingToAddStopovers: false,
    carryOnOnly: false,
  }
};

export default function App() {
  const [sessionId, setSessionId] = useState<string>('');
  const [formState, setFormState] = useState<FlightSearchFormState>(() => {
    const saved = localStorage.getItem('flight_form_state');
    return saved ? JSON.parse(saved) : DEFAULT_FORM_STATE;
  });
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showValidationErrors, setShowValidationErrors] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // Initialize Session ID & Load Saved Chat History
  useEffect(() => {
    // Session ID
    let currentSessionId = localStorage.getItem('flight_chat_sessionId');
    if (!currentSessionId) {
      currentSessionId = `sess_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
      localStorage.setItem('flight_chat_sessionId', currentSessionId);
    }
    setSessionId(currentSessionId);

    // Initial message default
    const initialMsgTime = new Date().toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });
    const fallbackInitialMsg: Message = {
      id: 'welcome-message',
      sender: 'bot',
      text: 'Pozdravljeni! Pomagam vam najti najboljše letalske karte. Vnesite relacijo, datume in število potnikov.',
      timestamp: initialMsgTime,
    };

    // Load messages
    const savedMessages = localStorage.getItem('flight_chat_history');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (parsed && parsed.length > 0) {
          setMessages(parsed);
        } else {
          setMessages([fallbackInitialMsg]);
        }
      } catch (err) {
        setMessages([fallbackInitialMsg]);
      }
    } else {
      setMessages([fallbackInitialMsg]);
    }
  }, []);

  // Sync Form State with localStorage
  useEffect(() => {
    localStorage.setItem('flight_form_state', JSON.stringify(formState));
  }, [formState]);

  // Sync Messages with localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('flight_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Clear Chat history action
  const handleClearHistory = () => {
    if (window.confirm('Ali ste prepričani, da želite počistiti zgodovino pogovora?')) {
      const initialMsgTime = new Date().toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });
      const welcome: Message = {
        id: 'welcome-message',
        sender: 'bot',
        text: 'Pozdravljeni! Pomagam vam najti najboljše letalske karte. Vnesite relacijo, datume in število potnikov.',
        timestamp: initialMsgTime,
      };
      setMessages([welcome]);
      localStorage.setItem('flight_chat_history', JSON.stringify([welcome]));
      setFormState(DEFAULT_FORM_STATE);
      setShowValidationErrors(false);
    }
  };

  // Check required validation (does not block, but will highlight inputs)
  const checkIsFormComplete = () => {
    const isOriginOk = !!formState.route.originCity.trim();
    const isDestinationOk = !!formState.route.destinationCity.trim();
    const isOutboundOk = !!formState.dates.outboundDate;
    const isReturnOk = formState.dates.tripType === 'one-way' || !!formState.dates.returnDate;
    const isPassengerOk = formState.passengers.numberOfPassengers >= 1;

    return isOriginOk && isDestinationOk && isOutboundOk && isReturnOk && isPassengerOk;
  };

  // Submit Handler / Send Message Trigger
  const handleSendMessage = async (text: string) => {
    if (isLoading) return;

    // Check validation and trigger highlights
    const isComplete = checkIsFormComplete();
    if (!isComplete) {
      setShowValidationErrors(true);
    }

    // 1. Append user message to state
    const userTimestamp = new Date().toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: userTimestamp,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // 2. Formulate JSON Payload
    const payload: MessagePayload = {
      sessionId: sessionId,
      timestamp: new Date().toISOString(),
      message: text,
      language: 'sl',
      route: {
        originCity: formState.route.originCity,
        destinationCity: formState.route.destinationCity,
      },
      dates: {
        outboundDate: formState.dates.outboundDate,
        returnDate: formState.dates.tripType === 'one-way' ? null : formState.dates.returnDate,
        tripType: formState.dates.tripType,
      },
      passengers: {
        numberOfPassengers: formState.passengers.numberOfPassengers,
        cabinClass: formState.passengers.cabinClass,
      },
      flexibility: {
        flexibleDays: formState.flexibility.flexibleDays,
        willingToAddStopovers: formState.flexibility.willingToAddStopovers,
        carryOnOnly: formState.flexibility.carryOnOnly,
      }
    };

    try {
      // 3. Post to n8n Webhook
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      let responseText = '';
      let isErrorStatus = false;

      try {
        responseText = await response.text();
        isErrorStatus = !response.ok;
      } catch (e) {
        throw new Error(`Connection failure. HTTP Status: ${response.status}`);
      }

      if (isErrorStatus) {
        let n8nErrorMessage = '';
        try {
          const errObj = JSON.parse(responseText);
          n8nErrorMessage = errObj.message || errObj.error || '';
        } catch (_) {}

        if (responseText.includes("Unused Respond to Webhook node") || n8nErrorMessage.includes("Unused Respond to Webhook")) {
          const n8nInstructions = 
            `⚠️ Konfiguracijska težava v n8n:\n"${n8nErrorMessage || 'Unused Respond to Webhook node found in the workflow'}"\n\n` +
            `**Kako rešiti to napako v vašem n8n:**\n` +
            `1. Odprite vaš n8n delovni tok (workflow).\n` +
            `2. Dvakrat kliknite na začetno vozlišče **Webhook** (trigger).\n` +
            `3. V nastavitvah tega vozlišča poiščite parameter **Response Mode** (oz. "Respond").\n` +
            `4. Spremenite izbiro iz "On Received" na **"Using 'Respond to Webhook' Node"**.\n` +
            `5. Ponovno shranite in aktivirajte workflow ter poskusite poslati sporočilo tukaj.\n\n` +
            `Ta nastavitev bo n8n naročila, naj počaka na izvedbo vozlišča "Respond to Webhook" in vrne njegov odgovor.`;

          const errBotMsg: Message = {
            id: `bot_err_${Date.now()}`,
            sender: 'bot',
            text: n8nInstructions,
            timestamp: new Date().toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' }),
            isError: true,
          };
          setMessages((prev) => [...prev, errBotMsg]);
          return;
        } else {
          throw new Error(`HTTP Error Status: ${response.status}. Body: ${responseText}`);
        }
      }

      let replyText = '';

      // Try parsing as JSON if it looks like JSON or content-type is JSON
      const isJson = (response.headers.get('content-type') || '').includes('application/json') ||
                     responseText.trim().startsWith('{') ||
                     responseText.trim().startsWith('[');

      if (isJson) {
        try {
          const responseData = JSON.parse(responseText);
          if (Array.isArray(responseData) && responseData.length > 0) {
            const item = responseData[0];
            replyText = item?.reply || item?.message || (typeof item === 'string' ? item : '');
          } else if (responseData && typeof responseData === 'object') {
            replyText = responseData.reply || responseData.message || '';
          } else if (typeof responseData === 'string') {
            replyText = responseData;
          }
        } catch (e) {
          // Fall back to raw text if JSON parsing fails
          replyText = responseText;
        }
      }

      // If replyText is still empty or it was not JSON, fallback to raw response text
      if (!replyText.trim()) {
        replyText = responseText;
      }

      // Fallback if we received absolutely empty response
      if (!replyText.trim()) {
        replyText = 'Prejet je bil prazen odgovor s strani n8n.';
      }

      const botMsg: Message = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);

    } catch (error) {
      console.error('Error during flight webhook fetch:', error);
      
      // Error message is added to chat directly as requested
      const errBotMsg: Message = {
        id: `bot_err_${Date.now()}`,
        sender: 'bot',
        text: 'Prišlo je do napake pri komunikaciji s strežnikom.',
        timestamp: new Date().toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };

      setMessages((prev) => [...prev, errBotMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-bg text-slate-800 font-sans antialiased pb-12 overflow-x-hidden transition-all">
      
      {/* HEADER SECTION */}
      <header className="glass sticky top-0 z-50 transition-all backdrop-blur-md border-b border-white/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/10">
              <Plane className="w-5.5 h-5.5 transform -rotate-12" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-950 flex items-center gap-1">
                SkyBot <span className="text-blue-600 italic">AI</span>
              </h1>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block -mt-1">
                Letalski pomočnik
              </span>
            </div>
          </div>

          {/* Guide and External Badges */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm ${
                showGuide 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white/80 border border-slate-200/60 hover:bg-white text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{showGuide ? 'Zapri navodila' : 'Navodila za integracijo'}</span>
            </button>

            <a
              href="https://bimp-primary.up.railway.app/webhook-test/74b46b23-9f06-4713-bd57-3eaac65a3516"
              target="_blank"
              referrerPolicy="no-referrer"
              className="hidden md:flex items-center gap-1 px-3 py-1 bg-white/70 border border-slate-250/20 text-slate-600 hover:bg-white hover:text-slate-800 rounded-full text-xs font-medium shadow-sm"
            >
              <span>Webhook link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

        </div>
      </header>

      {/* COLLAPSIBLE GUIDE PANEL */}
      {showGuide && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="glass bg-slate-900/95 text-white rounded-3xl p-6 md:p-8 shadow-xl space-y-6 relative overflow-hidden border border-white/20">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10">
              <Plane className="w-80 h-80" />
            </div>
            
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold tracking-tight">Dokumentacija integracije & Namestitveni vodnik</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-blue-300 border-b border-slate-700 pb-1.5 uppercase tracking-wider">
                  N8N Spletna Povezava (Webhook)
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ta aplikacija je nastavljena tako, da pošilja informacije neposredno v n8n spletno povezavo na naslovu:
                </p>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl font-mono text-[11px] overflow-x-auto text-emerald-400">
                  {WEBHOOK_URL}
                </div>
                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50 space-y-1">
                  <p className="text-xs font-semibold text-white">CORS Prepreke (Pomembno):</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Ker brskalniki privzeto blokirajo zunanje domene, n8n webhook zahteva omogočen CORS. V vašem nastavitvenem n8n webhook vozlišču (node) poskrbite, da je glava <code>Access-Control-Allow-Origin</code> nastavljena na <code>*</code> ali domeno te aplikacije, oziroma da so piškotki preverbe pravilno konfigurirani.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-blue-300 border-b border-slate-700 pb-1.5 uppercase tracking-wider">
                  Navodila za namestitev na Vercel
                </h4>
                <ol className="text-xs text-slate-300 space-y-2.5 list-decimal pl-4">
                  <li>
                    <strong>Uvoz v vaš GitHub:</strong> Naložite celotno strukturo projekta v kateri koli javni ali zasebni repozitorij na GitHubu.
                  </li>
                  <li>
                    <strong>Priklop na Vercel:</strong> Odprite <a href="https://vercel.com" target="_blank" className="text-blue-400 hover:underline">Vercel Dashboard</a>, kliknite <em>Add New &gt; Project</em> in izberite uvožen repozitorij.
                  </li>
                  <li>
                    <strong>Vite konfiguracija:</strong> Vercel bo avtomatsko zaznal Vite predlogo. Nastavitve gradnje (Build command) lahko pustite na privzeti vrednosti <code>npm run build</code>, izhodni imenik pa bo <code>dist</code>.
                  </li>
                  <li>
                    <strong>Okoljske spremenljivke:</strong> Če želite dinamično spreminjati webhook naslov, lahko v kodi dodate preverjanje <code>import.meta.env.VITE_WEBHOOK_URL</code> ter jo nastavite v Vercel nastavitvah.
                  </li>
                </ol>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MAIN LAYOUT CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* Intro Hero Badge */}
        <div className="text-center md:text-left mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full mb-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping"></span>
            <span>Pameten iskalnik letalskih povezav</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Poiščite naslednjo destinacijo z letalskim asistentom
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Izpolnite podatke na levi formi ali preprosto klepetajte z AI asistentom. Oboje deluje sinhronizirano in nudi optimalno uporabniško izkušnjo.
          </p>
        </div>

        {/* Responsive Grid Setup - Two Column split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Structured Form */}
          <section className="lg:col-span-5 w-full">
            <FlightForm 
              formState={formState}
              onChange={setFormState}
              showValidationErrors={showValidationErrors}
            />
          </section>

          {/* RIGHT: Live Bot Chat Interface */}
          <section className="lg:col-span-7 w-full">
            <ChatInterface 
              messages={messages}
              isLoading={isLoading}
              onSendMessage={handleSendMessage}
              onClearHistory={handleClearHistory}
              formState={formState}
              onFormChange={setFormState}
            />
          </section>

        </div>

      </main>

    </div>
  );
}
