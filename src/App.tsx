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
import SearchResults from './components/SearchResults';
import { FlightSearchFormState, MessagePayload } from './types';
import { generatePromptFromState } from './utils/prompt';

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
  
  const [searchState, setSearchState] = useState<'initial' | 'loading' | 'success' | 'error'>('initial');
  const [resultsText, setResultsText] = useState<string>('');
  const [errorText, setErrorText] = useState<string>('');
  const [showValidationErrors, setShowValidationErrors] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // Initialize Session ID
  useEffect(() => {
    let currentSessionId = localStorage.getItem('flight_chat_sessionId');
    if (!currentSessionId) {
      currentSessionId = `sess_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
      localStorage.setItem('flight_chat_sessionId', currentSessionId);
    }
    setSessionId(currentSessionId);
  }, []);

  // Sync Form State with localStorage
  useEffect(() => {
    localStorage.setItem('flight_form_state', JSON.stringify(formState));
  }, [formState]);

  // Check required validation
  const checkIsFormComplete = () => {
    const isOriginOk = !!formState.route.originCity.trim();
    const isDestinationOk = !!formState.route.destinationCity.trim();
    const isOutboundOk = !!formState.dates.outboundDate;
    const isReturnOk = formState.dates.tripType === 'one-way' || !!formState.dates.returnDate;
    const isPassengerOk = formState.passengers.numberOfPassengers >= 1;

    // Check if return date is earlier than outbound date
    const isReturnEarlierThanOutbound = formState.dates.tripType === 'round-trip' && 
      !!formState.dates.outboundDate && 
      !!formState.dates.returnDate && 
      formState.dates.returnDate < formState.dates.outboundDate;

    return isOriginOk && isDestinationOk && isOutboundOk && isReturnOk && isPassengerOk && !isReturnEarlierThanOutbound;
  };

  // Reset search state
  const handleReset = () => {
    setFormState(DEFAULT_FORM_STATE);
    setSearchState('initial');
    setResultsText('');
    setErrorText('');
    setShowValidationErrors(false);
  };

  // Submit Handler / AI Flight Search Trigger in Background
  const handleSearch = async () => {
    if (searchState === 'loading') return;

    // Check validation and trigger highlights if missing
    const isComplete = checkIsFormComplete();
    if (!isComplete) {
      setShowValidationErrors(true);
      return;
    }

    setShowValidationErrors(false);
    setSearchState('loading');
    setErrorText('');

    const textPayload = generatePromptFromState(formState);

    // Formulate JSON Payload
    const payload: MessagePayload = {
      sessionId: sessionId,
      timestamp: new Date().toISOString(),
      message: textPayload,
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
        throw new Error(`Poizvedba ni uspela. Status kode strežnika: ${response.status}`);
      }

      if (isErrorStatus) {
        let n8nErrorMessage = '';
        let helpSlovene = '';
        try {
          const errObj = JSON.parse(responseText);
          n8nErrorMessage = errObj.message || errObj.error || '';
          if (errObj.diagnostics && errObj.diagnostics.helpSlovene) {
            helpSlovene = errObj.diagnostics.helpSlovene;
          }
        } catch (_) {}

        if (helpSlovene) {
          throw new Error(helpSlovene);
        }

        if (responseText.includes("Unused Respond to Webhook node") || n8nErrorMessage.includes("Unused Respond to Webhook")) {
          const n8nInstructions = 
            `⚠️ Konfiguracijska težava v delovnem toku:\n"${n8nErrorMessage || 'Unused Respond to Webhook'}"\n\n` +
            `**Kako rešiti to napako v vaših nastavitvah:**\n` +
            `1. Odprite vaš delovni tok (workflow).\n` +
            `2. Dvakrat kliknite na začetno vozlišče **Webhook** (trigger).\n` +
            `3. V nastavitvah tega vozlišča poiščite parameter **Response Mode**.\n` +
            `4. Spremenite izbiro iz "On Received" na **"Using 'Respond to Webhook' Node"**.\n` +
            `5. Ponovno shranite in aktivirajte delovni tok.`;
          throw new Error(n8nInstructions);
        } else {
          throw new Error(n8nErrorMessage || responseText || `HTTP status: ${response.status}`);
        }
      }

      let replyText = '';

      // Try parsing as JSON
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
          replyText = responseText;
        }
      }

      if (!replyText.trim()) {
        replyText = responseText;
      }

      if (!replyText.trim()) {
        replyText = 'Prejet je bil prazen odgovor s strani strežnika.';
      }

      setResultsText(replyText);
      setSearchState('success');

    } catch (error: any) {
      console.error('Error during flight searches webhook fetch:', error);
      
      const errMsg = error.message || '';
      const isTestWebhook404 = errMsg.includes("is not registered") || errMsg.includes("webhook-test") || errMsg.includes("404");
      const isWorkflowFailed500 = errMsg.includes("Workflow execution failed") || errMsg.includes("500");

      let userFriendlyMessage = 'Prišlo je do napake pri komunikaciji s strežnikom.';
      
      if (isTestWebhook404) {
        userFriendlyMessage = `⚠️ Testni Webhook ni aktiven oz. ni registriran!\n\n` +
          `V nastavitvah imate vpisano testno povezavo (\`webhook-test\` oz. 404 napaka). Testni URL deluje **le takrat**, ko imate odprt urejevalnik delovnega toka in kliknete gumb **"Execute workflow"** tik pred pošiljanjem sporočila.\n\n` +
          `**Kako vzpostaviti trajno povezavo, ki deluje vedno:**\n` +
          `1. Spremenite URL iz **Test** v **Production** (tako da iz URL-ja odstranite besedo \`-test\`, torej URL bo oblike \`/webhook/...\`).\n` +
          `2. V zgornjem desnem kotu delovnega toka vklopite stikalo **Active** (Aktivno), da ga aktivirate za stalno.\n\n` +
          `**Prejeta napaka:**\n"${errMsg}"`;
      } else if (isWorkflowFailed500) {
        userFriendlyMessage = `⚠️ Delovni tok se je sprožil, vendar se je izvedba sesula!\n\n` +
          `Vozlišče delovnega toka je vrnilo napako **"Workflow execution failed"** (Status 500). To pomeni, da je povezava narejena in se odzove, vendar se v samem delovnem toku (workflowu) pojavi napaka pri enem izmed vaših vozlišč (npr. napačne nastavitve v AI ali API vozlišču).\n\n` +
          `**Kako odpraviti težavo:**\n` +
          `1. Odprite vaš urejevalnik delovnega toka.\n` +
          `2. V levem meniju kliknite na **Executions** (Zgodovina izvedb).\n` +
          `3. Poiščite zadnjo neuspešno izvedbo z rdečo oznako in kliknite nanjo, da vidite, katero vozlišče (Node) javi napako in zakaj.`;
      } else if (errMsg) {
        userFriendlyMessage = errMsg.startsWith('⚠️') ? errMsg : `Prišlo je do napake pri komunikaciji s strežnikom:\n"${errMsg}"`;
      }

      setErrorText(userFriendlyMessage);
      setSearchState('error');
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

          {/* Guide and External Badges removed as per request */}

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
                  Spletna Povezava (Webhook)
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ta aplikacija je nastavljena tako, da pošilja informacije neposredno v spletno povezavo na naslovu:
                </p>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl font-mono text-[11px] overflow-x-auto text-emerald-400">
                  {WEBHOOK_URL}
                </div>
                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50 space-y-1">
                  <p className="text-xs font-semibold text-white">CORS Prepreke (Pomembno):</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Ker brskalniki privzeto blokirajo zunanje domene, spletna povezava zahteva omogočen CORS. V vašem nastavitvenem webhook vozlišču poskrbite, da je glava <code>Access-Control-Allow-Origin</code> nastavljena na <code>*</code> ali domeno te aplikacije, oziroma da so piškotki preverbe pravilno konfigurirani.
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
            Izpolnite parametre potovanja in naš AI asistent vam bo predlagal najboljše letalske povezave.
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
              isLoading={searchState === 'loading'}
              onSearch={handleSearch}
            />
          </section>

          {/* RIGHT: Search Results Panel */}
          <section className="lg:col-span-7 w-full">
            <SearchResults 
              searchState={searchState}
              resultsText={resultsText}
              errorText={errorText}
              formState={formState}
              onReset={handleReset}
              onRetry={handleSearch}
            />
          </section>

        </div>

      </main>

    </div>
  );
}
