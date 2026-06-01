import React from 'react';
import { 
  PlaneTakeoff, 
  PlaneLanding, 
  Calendar, 
  Users, 
  ArrowLeftRight, 
  AlertCircle, 
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  MessageSquare,
  Send
} from 'lucide-react';
import { FlightSearchFormState, CabinClassType, TripTypeType } from '../types';

interface FlightFormProps {
  formState: FlightSearchFormState;
  onChange: (updater: (prev: FlightSearchFormState) => FlightSearchFormState) => void;
  showValidationErrors: boolean;
  onGeneratePrompt: (autoSend: boolean) => void;
}

export default function FlightForm({ formState, onChange, showValidationErrors, onGeneratePrompt }: FlightFormProps) {
  const { route, dates, passengers, flexibility } = formState;

  // Swap origin and destination
  const handleSwapRoute = () => {
    onChange((prev) => ({
      ...prev,
      route: {
        originCity: prev.route.destinationCity,
        destinationCity: prev.route.originCity,
      }
    }));
  };

  // Field updater helpers
  const updateRoute = (key: keyof typeof route, value: string) => {
    onChange((prev) => ({
      ...prev,
      route: {
        ...prev.route,
        [key]: value
      }
    }));
  };

  const updateDates = (key: keyof typeof dates, value: any) => {
    onChange((prev) => {
      const newDates = {
        ...prev.dates,
        [key]: value
      };
      
      // If toggled to one-way, returnDate must be null in state
      if (key === 'tripType' && value === 'one-way') {
        newDates.returnDate = null;
      }
      // If toggled to round-trip and returnDate was null, default it to outbound or empty string
      if (key === 'tripType' && value === 'round-trip' && !newDates.returnDate) {
        newDates.returnDate = prev.dates.outboundDate || '';
      }
      
      return {
        ...prev,
        dates: newDates
      };
    });
  };

  const updatePassengers = (key: keyof typeof passengers, value: any) => {
    onChange((prev) => ({
      ...prev,
      passengers: {
        ...prev.passengers,
        [key]: value
      }
    }));
  };

  const updateFlexibility = (key: keyof typeof flexibility, value: any) => {
    onChange((prev) => ({
      ...prev,
      flexibility: {
        ...prev.flexibility,
        [key]: value
      }
    }));
  };

  // Validation state checks (reactive)
  const isOriginMissing = !route.originCity.trim();
  const isDestinationMissing = !route.destinationCity.trim();
  const isOutboundMissing = !dates.outboundDate;
  const isReturnMissing = dates.tripType === 'round-trip' && !dates.returnDate;
  const isPassengerCountInvalid = passengers.numberOfPassengers < 1;

  return (
    <div id="flight-form" className="glass rounded-3xl shadow-xl p-6 lg:p-8 space-y-6 transition-all border-white/55">
      {/* Form Header */}
      <div className="flex items-center justify-between border-b border-white/40 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-1.5 bg-blue-100/60 text-blue-600 rounded-lg shadow-sm">
              <PlaneTakeoff className="w-5 h-5" />
            </span>
            Parametri leta
          </h2>
          <p className="text-xs text-slate-500 mt-1">Vnesite relacijo in želene pogoje potovanja.</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 bg-white/60 backdrop-blur px-2.5 py-1 rounded-full text-xs text-slate-500 font-medium border border-white/60 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
          Sinhronizirano
        </div>
      </div>

      {/* TRIP TYPE SELECTION */}
      <div className="flex bg-slate-200/50 p-1 rounded-xl w-64 border border-white/40 shadow-inner">
        <button
          type="button"
          onClick={() => updateDates('tripType', 'round-trip')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            dates.tripType === 'round-trip'
              ? 'bg-white text-slate-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Povratno potovanje
        </button>
        <button
          type="button"
          onClick={() => updateDates('tripType', 'one-way')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            dates.tripType === 'one-way'
              ? 'bg-white text-slate-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Enosmerni let
        </button>
      </div>

      {/* ROUTE INFO */}
      <div className="space-y-4">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block ml-1">Relacija letenja</label>
        
        <div className="grid grid-cols-1 md:grid-cols-9 items-center gap-3 relative">
          <div className="md:col-span-4 relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <PlaneTakeoff className="w-4 h-4" />
            </div>
            <input
              id="origin-city-input"
              type="text"
              placeholder="Odhodno mesto ali letališče"
              value={route.originCity}
              onChange={(e) => updateRoute('originCity', e.target.value)}
              className={`w-full pl-10 pr-3 py-3 text-sm bg-white/80 border rounded-xl font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all shadow-sm ${
                showValidationErrors && isOriginMissing
                  ? 'border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50/20'
                  : 'border-slate-200/80 focus:ring-blue-100 focus:border-blue-400'
              }`}
            />
            {showValidationErrors && isOriginMissing && (
              <div className="absolute right-3 inset-y-0 flex items-center pointer-events-none text-red-500">
                <AlertCircle className="w-4 h-4" />
              </div>
            )}
          </div>

          <div className="md:col-span-1 justify-self-center z-10">
            <button
              type="button"
              onClick={handleSwapRoute}
              title="Zamenjaj mesti"
              className="p-2.5 rounded-xl border border-white/70 hover:border-slate-300 hover:bg-white text-slate-500 hover:text-slate-700 active:scale-95 transition-all shadow-md bg-white/90"
            >
              <ArrowLeftRight className="w-4 h-4 md:rotate-0 rotate-90" />
            </button>
          </div>

          <div className="md:col-span-4 relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <PlaneLanding className="w-4 h-4" />
            </div>
            <input
              id="destination-city-input"
              type="text"
              placeholder="Namembno mesto ali letališče"
              value={route.destinationCity}
              onChange={(e) => updateRoute('destinationCity', e.target.value)}
              className={`w-full pl-10 pr-3 py-3 text-sm bg-white/80 border rounded-xl font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all shadow-sm ${
                showValidationErrors && isDestinationMissing
                  ? 'border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50/20'
                  : 'border-slate-200/80 focus:ring-blue-100 focus:border-blue-400'
              }`}
            />
            {showValidationErrors && isDestinationMissing && (
              <div className="absolute right-3 inset-y-0 flex items-center pointer-events-none text-red-500">
                <AlertCircle className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>
        {showValidationErrors && (isOriginMissing || isDestinationMissing) && (
          <p className="text-xs text-red-550 flex items-center gap-1 font-semibold ml-1">
            <AlertCircle className="w-3.5 h-3.5" /> Prosimo, vnesite začetno in končno lokacijo.
          </p>
        )}
      </div>

      {/* DATES */}
      <div className="space-y-4">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block ml-1">Datumi potovanja</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider absolute top-1.5 left-3.5 z-10 pointer-events-none">
              Odhod
            </span>
            <div className="absolute bottom-3.5 left-3.5 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-4 h-4" />
            </div>
            <input
              id="outbound-date-input"
              type="date"
              value={dates.outboundDate}
              onChange={(e) => updateDates('outboundDate', e.target.value)}
              className={`w-full pl-10 pr-3 pt-6 pb-2.5 text-sm bg-white/80 border rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition-all shadow-sm ${
                showValidationErrors && isOutboundMissing
                  ? 'border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50/20'
                  : 'border-slate-200/80 focus:ring-blue-100 focus:border-blue-400'
              }`}
            />
          </div>

          <div className={`relative transition-all ${dates.tripType === 'one-way' ? 'opacity-40' : 'opacity-100'}`}>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider absolute top-1.5 left-3.5 z-10 pointer-events-none">
              Povratek {dates.tripType === 'one-way' && '(Enosmerno)'}
            </span>
            <div className="absolute bottom-3.5 left-3.5 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-4 h-4" />
            </div>
            <input
              id="return-date-input"
              type="date"
              disabled={dates.tripType === 'one-way'}
              value={dates.returnDate || ''}
              onChange={(e) => updateDates('returnDate', e.target.value)}
              className={`w-full pl-10 pr-3 pt-6 pb-2.5 text-sm bg-white/80 border rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition-all shadow-sm ${
                dates.tripType === 'one-way'
                  ? 'bg-slate-200/40 border-dashed border-slate-300 cursor-not-allowed text-slate-400 shadow-inner'
                  : showValidationErrors && isReturnMissing
                  ? 'border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50/20'
                  : 'border-slate-200/80 focus:ring-blue-100 focus:border-blue-400'
              }`}
            />
          </div>
        </div>
        {showValidationErrors && (isOutboundMissing || isReturnMissing) && (
          <p className="text-xs text-red-550 flex items-center gap-1 font-semibold ml-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {isOutboundMissing && isReturnMissing
              ? 'Potrebno je vnesti datuma odhoda in povratka.'
              : isOutboundMissing
              ? 'Potrebno je vnesti datum odhoda.'
              : 'Za povratno potovanje je potreben datum povratka.'}
          </p>
        )}
      </div>

      {/* PASSENGERS & CABIN CLASS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PASSENGERS */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block ml-1">Število potnikov</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updatePassengers('numberOfPassengers', Math.max(1, passengers.numberOfPassengers - 1))}
              className="px-3.5 py-2.5 border border-slate-200/80 rounded-xl font-bold bg-white/80 text-slate-600 hover:text-slate-950 hover:bg-white active:scale-95 transition-all text-sm shadow-sm"
            >
              -
            </button>
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                <Users className="w-4 h-4" />
              </div>
              <input
                id="passenger-count-input"
                type="number"
                min="1"
                value={passengers.numberOfPassengers}
                onChange={(e) => updatePassengers('numberOfPassengers', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-center pl-8 pr-3 py-2.5 border border-slate-200/80 bg-white/80 font-bold text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-sm shadow-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => updatePassengers('numberOfPassengers', passengers.numberOfPassengers + 1)}
              className="px-3.5 py-2.5 border border-slate-200/80 rounded-xl font-bold bg-white/80 text-slate-600 hover:text-slate-950 hover:bg-white active:scale-95 transition-all text-sm shadow-sm"
            >
              +
            </button>
          </div>
        </div>

        {/* CABIN CLASS */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block ml-1">Razred kabine</label>
          <div className="relative">
            <select
              id="cabin-class-select"
              value={passengers.cabinClass}
              onChange={(e) => updatePassengers('cabinClass', e.target.value as CabinClassType)}
              className="w-full pl-3 pr-10 py-3 bg-white/80 border border-slate-200/80 rounded-xl font-semibold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white appearance-none cursor-pointer transition-all shadow-sm"
            >
              <option value="economy">Economy (Ekonomska)</option>
              <option value="premium economy">Premium Economy</option>
              <option value="business">Business (Poslovna)</option>
              <option value="first">First class (Prvi razred)</option>
            </select>
            <div className="absolute right-3.5 inset-y-0 flex items-center pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* FLEXIBILITY */}
      <div className="pt-4 border-t border-white/40 space-y-4">
        <label className="text-[11px] font-bold text-slate-500 uppercase block ml-1">Dodatni pogoji & Prilagodljivost</label>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* FLEXIBLE DAYS DROPDOWN */}
          <div className="space-y-1.5 sm:col-span-1">
            <span className="text-[11px] font-semibold text-slate-500 block ml-1">Prilagodljivost datumov</span>
            <div className="relative">
              <select
                id="flexibility-days-select"
                value={flexibility.flexibleDays}
                onChange={(e) => updateFlexibility('flexibleDays', parseInt(e.target.value) || 0)}
                className="w-full pl-3 pr-9 py-2 bg-white/80 border border-slate-200/80 text-slate-800 font-semibold text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white appearance-none cursor-pointer transition-all shadow-sm"
              >
                <option value={0}>Točni datumi (Akuratno)</option>
                <option value={1}>± 1 dan</option>
                <option value={2}>± 2 dni</option>
                <option value={3}>± 3 dni</option>
              </select>
              <div className="absolute right-2.5 inset-y-0 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* TOGGLES */}
          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4 sm:pt-1">
            {/* STOPOVERS TOGGLE */}
            <button
              type="button"
              id="stopover-toggle-btn"
              onClick={() => updateFlexibility('willingToAddStopovers', !flexibility.willingToAddStopovers)}
              className="flex items-center justify-between p-2.5 bg-white/70 hover:bg-white border border-slate-200/60 hover:border-slate-300 rounded-xl cursor-pointer text-left transition-all shadow-sm"
            >
              <div className="space-y-0.5 pr-2">
                <span className="text-xs font-bold text-slate-800 block">Prestopanja</span>
                <span className="text-[10px] text-slate-500 font-medium block">Dovoli s prestopi</span>
              </div>
              <div className="text-slate-400 hover:text-slate-600 transition-colors">
                {flexibility.willingToAddStopovers ? (
                  <ToggleRight className="w-8 h-8 text-blue-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-300" />
                )}
              </div>
            </button>

            {/* CARRY ON ONLY */}
            <button
              type="button"
              id="carryon-toggle-btn"
              onClick={() => updateFlexibility('carryOnOnly', !flexibility.carryOnOnly)}
              className="flex items-center justify-between p-2.5 bg-white/70 hover:bg-white border border-slate-200/60 hover:border-slate-300 rounded-xl cursor-pointer text-left transition-all shadow-sm"
            >
              <div className="space-y-0.5 pr-2">
                <span className="text-xs font-bold text-slate-800 block">Samo ročna prtljaga</span>
                <span className="text-[10px] text-slate-500 font-medium block">Brez oddane prtljage</span>
              </div>
              <div className="text-slate-400 hover:text-slate-600 transition-colors">
                {flexibility.carryOnOnly ? (
                  <ToggleRight className="w-8 h-8 text-blue-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-300" />
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* PROMPT GENERATION ACTIONS */}
      <div className="pt-5 border-t border-slate-200/50 space-y-3">
        <div className="flex items-center gap-1.5 px-1">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Integriran Klepetalni Prompt</span>
        </div>
        
        <p className="text-[11px] text-slate-500 leading-relaxed px-1">
          Spodnji gumbi avtomatično prevedejo zgornje parametre leta v strukturirano vprašanje za SkyBot AI asistent v n8n.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            id="prepare-prompt-btn"
            onClick={() => onGeneratePrompt(false)}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl font-bold text-xs tracking-tight shadow-sm border border-slate-200 hover:border-slate-300 transition-all cursor-pointer select-none"
            title="Sestavi sporočilo in ga vpiši v polje spodaj za klepet."
          >
            <MessageSquare className="w-4 h-4 text-slate-500" />
            <span>1. Pripravi vprašanje</span>
          </button>

          <button
            type="button"
            id="send-prompt-btn"
            onClick={() => onGeneratePrompt(true)}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs tracking-tight shadow-md hover:shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all cursor-pointer select-none"
            title="Sestavi sporočilo in ga takoj pošlji n8n asistentu."
          >
            <Send className="w-3.5 h-3.5 text-blue-100" />
            <span>2. Hitro pošlji v klepet</span>
          </button>
        </div>
      </div>

    </div>
  );
}
