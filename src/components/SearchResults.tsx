import React from 'react';
import { 
  Plane, 
  Search, 
  Sparkles, 
  AlertCircle, 
  Activity, 
  RefreshCw, 
  Calendar, 
  User, 
  ArrowRight, 
  MapPin, 
  Compass, 
  DollarSign, 
  Info,
  Clock,
  ExternalLink,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { FlightSearchFormState } from '../types';

interface SearchResultsProps {
  searchState: 'initial' | 'loading' | 'success' | 'error';
  resultsText: string;
  errorText: string;
  formState: FlightSearchFormState;
  onReset: () => void;
  onRetry: () => void;
}

// An interface representing a parsed flight card
interface ParsedFlight {
  airline: string;
  price: string;
  route: string;
  departureTime?: string;
  duration?: string;
  connection?: string;
  rawText: string;
}

export default function SearchResults({ 
  searchState, 
  resultsText, 
  errorText, 
  formState, 
  onReset, 
  onRetry 
}: SearchResultsProps) {

  // Helper parser to extract structured flights from the AI feedback text
  const parseFlightsFromText = (text: string): ParsedFlight[] => {
    if (!text) return [];
    
    // We split by lines to isolate connection options
    const lines = text.split('\n');
    const parsedFlights: ParsedFlight[] = [];
    
    // Common airlines in the region
    const knownAirlines = [
      'Lufthansa', 'Ryanair', 'Wizz Air', 'EasyJet', 'Turkish Airlines', 
      'Croatia Airlines', 'Austrian Airlines', 'Air France', 'KLM', 
      'Qatar Airways', 'Emirates', 'Flydubai', 'British Airways', 'Brussels Airlines',
      'Swiss', 'Air Serbia', 'Iberia', 'Volotea', 'Eurowings', 'LOT'
    ];

    lines.forEach((line) => {
      // Check if line contains a price icon/sign or "€" or "EUR" and seems related to a flight option
      const hasPrice = line.includes('€') || line.toLowerCase().includes('eur');
      const hasAirline = knownAirlines.some(airline => 
        line.toLowerCase().includes(airline.toLowerCase())
      );
      
      if (hasPrice) {
        // Find matched airline or default to General / Partner airline
        const matchedAirline = knownAirlines.find(airline => 
          line.toLowerCase().includes(airline.toLowerCase())
        ) || 'Letalski prevoznik';

        // Extract price (e.g., 120 €, 95 EUR, od 30€)
        const priceRegex = /(\d+\s*€|\d+\s*EUR|od\s*\d+\s*€|od\s*\d+\s*EUR)/gi;
        const priceMatch = line.match(priceRegex);
        const price = priceMatch ? priceMatch[0] : 'Ugodna cena';

        // Extract potential times (e.g. 12:45, 14:15 or similar timing patterns)
        const timeRegex = /(\d{2}:\d{2})/g;
        const times = line.match(timeRegex);
        
        // Extract potential route/cities from form state or guess
        let flightRoute = `${formState.route.originCity || 'Odhod'} ➔ ${formState.route.destinationCity || 'Cilj'}`;
        if (line.includes('➔') || line.includes('→') || line.includes('-') || line.includes('do')) {
          const arrowIndex = line.indexOf('➔') !== -1 ? '➔' : (line.indexOf('→') !== -1 ? '→' : '-');
          const parts = line.split(arrowIndex);
          if (parts.length >= 2) {
            // Clean up left side and right side
            const p1 = parts[0].replace(/[^a-zA-Z\s]/g, '').trim();
            const p2 = parts[1].replace(/[^a-zA-Z\s]/g, '').trim();
            if (p1.length > 2 && p2.length > 2) {
              // Only keep last two words for destination prefix
              const words1 = p1.split(' ');
              const words2 = p2.split(' ');
              const city1 = words1[words1.length - 1];
              const city2 = words2[0];
              if (city1 && city2) {
                // Keep only valid text
                flightRoute = `${city1} ➔ ${city2}`;
              }
            }
          }
        }

        // Check if there is some duration pattern (e.g. "2h 30m" or "1p" or "direkten")
        let duration = 'Direktni let';
        if (line.toLowerCase().includes('prestop') || line.toLowerCase().includes('stopover')) {
          duration = '1 vmesni postanek';
        } else if (line.toLowerCase().includes('2 prestop') || line.toLowerCase().includes('2stop')) {
          duration = '2 prestopanja';
        }

        parsedFlights.push({
          airline: matchedAirline,
          price: price,
          route: flightRoute,
          departureTime: times?.join(' - ') || undefined,
          duration: duration,
          rawText: line.trim()
        });
      }
    });

    // Deduplicate or limit to first 4 best offers
    return parsedFlights.slice(0, 4);
  };

  // Human-friendly formatter to styling markdown/bullet text in custom lists
  const formatResultsText = (text: string) => {
    if (!text) return null;

    return text.split('\n').map((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return <div key={index} className="h-2" />;

      // Headings
      if (trimmedLine.startsWith('###')) {
        return (
          <h4 key={index} className="text-sm font-bold text-slate-900 mt-5 mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-1">
            <span className="w-1.5 h-3.5 bg-blue-500 rounded-sm"></span>
            {trimmedLine.replace('###', '').trim()}
          </h4>
        );
      }
      if (trimmedLine.startsWith('##') || trimmedLine.startsWith('#')) {
        return (
          <h3 key={index} className="text-base font-bold text-slate-950 mt-6 mb-3 flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-blue-600 shrink-0" />
            {trimmedLine.replace(/#+/g, '').trim()}
          </h3>
        );
      }

      // Check lists
      if (trimmedLine.startsWith('*') || trimmedLine.startsWith('-')) {
        return (
          <li key={index} className="text-xs text-slate-700 leading-relaxed ml-4 list-disc pl-1 mb-2.5 font-medium">
            {trimmedLine.substring(1).trim()}
          </li>
        );
      }

      // Numbered lists
      const isNumbered = /^\d+\.\s/.test(trimmedLine);
      if (isNumbered) {
        return (
          <div key={index} className="flex gap-2.5 py-1.5 px-3 bg-slate-50 border border-slate-100 rounded-xl my-2.5">
            <span className="font-bold text-blue-600 text-xs shrink-0">{trimmedLine.match(/^\d+\./)?.[0]}</span>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              {trimmedLine.replace(/^\d+\.\s+/, '')}
            </p>
          </div>
        );
      }

      // Normal text
      return (
        <p key={index} className="text-xs text-slate-600 font-medium leading-relaxed mb-3">
          {trimmedLine}
        </p>
      );
    });
  };

  const parsedFlights = parseFlightsFromText(resultsText);

  // Suggested popular destinations when in "initial" state
  const popularDestinations = [
    { city: 'London', code: 'LON', country: 'Združeno kraljestvo', desc: 'Slikovite ulice, kultni muzeji in živahno utrip.' },
    { city: 'Pariz', code: 'PAR', country: 'Francija', desc: 'Mesto luči, vrhunska kulinarika in romantično vzdušje.' },
    { city: 'Rim', code: 'ROM', country: 'Italija', desc: 'Starodavna zgodovina, pristen espresso in Kolosej.' },
    { city: 'Barcelona', code: 'BCN', country: 'Španija', desc: 'Sončne plaže, Gaudíjeva arhitektura in tapas bari.' }
  ];

  return (
    <div id="search-results-panel" className="flex flex-col min-h-[600px] lg:min-h-[680px] glass rounded-3xl overflow-hidden border-white/55 shadow-xl transition-all">
      
      {/* Panel Header */}
      <div className="bg-slate-900/95 backdrop-blur text-white px-6 py-4.5 flex items-center justify-between shadow-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Search className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
              Rezultati iskanja
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Pametni potovalni asistent</span>
          </div>
        </div>

        {searchState === 'success' && (
          <button
            type="button"
            onClick={onReset}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/60 hover:border-slate-600 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer select-none active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Nova poizvedba</span>
          </button>
        )}
      </div>

      {/* STATE PANELS */}

      {/* 1. INITIAL STATE */}
      {searchState === 'initial' && (
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between bg-slate-100/10 backdrop-blur">
          <div className="my-auto space-y-6 max-w-lg mx-auto text-center py-6">
            <div className="w-18 h-18 bg-blue-100/80 rounded-3xl flex items-center justify-center text-blue-600 mx-auto shadow-md border border-white/70">
              <Compass className="w-9 h-9 animate-[spin_10s_linear_infinite]" />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-extrabold text-slate-900 tracking-tight">Pripravljeni na potovanje?</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Izpolnite parametre leta na levi strani (odhod, cilj, datume in potnike) in kliknite gumb <strong className="text-blue-600 font-extrabold">"Poišči lete"</strong>.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Naš AI pomočnik bo pregledal spletne vire, primerjal možnosti ter vam hipoma sestavil optimalen načrt potovanja.
              </p>
            </div>
          </div>

          {/* Suggested quick cards */}
          <div className="pt-6 border-t border-slate-200/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3.5">Priljubljeni letalski načrti</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-35">
              {popularDestinations.map((dest) => (
                <div 
                  key={dest.code}
                  className="bg-white/75 p-3.5 rounded-2xl border border-slate-200/40 shadow-sm flex gap-3 items-start hover:bg-white hover:border-slate-300 transition-all cursor-default"
                >
                  <div className="w-8.5 h-8.5 bg-blue-50 text-blue-600 font-bold text-xs rounded-xl flex items-center justify-center shrink-0 border border-blue-100">
                    {dest.code}
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 block">{dest.city} ({dest.country})</span>
                    <span className="text-[10px] text-slate-500 font-normal leading-relaxed block">{dest.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. LOADING STATE */}
      {searchState === 'loading' && (
        <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-100/10 backdrop-blur space-y-6">
          <div className="relative">
            {/* Spinning outward track */}
            <div className="w-24 h-24 rounded-full border-4 border-dashed border-blue-500/30 animate-[spin_8s_linear_infinite] flex items-center justify-center" />
            {/* Pulsing card indicator */}
            <div className="absolute inset-0 m-auto w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Plane className="w-8 h-8 animate-bounce transform -rotate-12" />
            </div>
            {/* Orbiting dot */}
            <div className="absolute -top-1 left-1/2 w-3.5 h-3.5 bg-indigo-500 rounded-full border-2 border-white shadow-md animate-ping" />
          </div>

          <div className="text-center space-y-2 max-w-sm">
            <h4 className="text-base font-extrabold text-slate-900 tracking-tight animate-pulse">
              Iščem najboljše lete...
            </h4>
            
            {/* Progress lines */}
            <div className="space-y-2.5 pt-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/80 border border-slate-200/40 rounded-xl shadow-xs text-left">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
                <span className="text-[10px] text-slate-500 font-semibold">Primerjam prevoznike ({formState.passengers.cabinClass})...</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/80 border border-slate-200/40 rounded-xl shadow-xs text-left">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shrink-0" />
                <span className="text-[10px] text-slate-500 font-semibold">Preverjam časovne razpone v {formState.route.destinationCity || 'cilju'}...</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 pt-2 font-medium">To običajno traja le nekaj sekund.</p>
          </div>
        </div>
      )}

      {/* 3. ERROR STATE */}
      {searchState === 'error' && (
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between bg-slate-100/10 backdrop-blur">
          <div className="my-auto max-w-lg mx-auto space-y-6 text-center py-6">
            <div className="w-16 h-16 bg-red-100 text-red-650 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-red-200">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2.5">
              <h4 className="text-base font-extrabold text-slate-900 tracking-tight">Prišlo je do napake pri iskanju</h4>
              <div className="bg-red-50/50 p-4 border border-red-100 rounded-2xl text-[11px] text-red-850 font-semibold text-left space-y-1.5 whitespace-pre-wrap leading-relaxed shadow-inner">
                {errorText || 'Neznana napaka pri poizvedovanju.'}
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                type="button"
                onClick={onRetry}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/15 cursor-pointer transition-all active:scale-98"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Poskusi ponovno</span>
              </button>
              <button
                type="button"
                onClick={onReset}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-98"
              >
                <span>Nazaj na začetek</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-900 text-slate-300 rounded-2xl border border-white/5 space-y-2 shadow-md">
            <p className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-400" /> CORS & TEHNIČNI NAMIG glede Webhookov
            </p>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Če se napaka ponavlja, poskrbite, da ima izbrani strežniški webhook pravilno odprte glave CORS (<code>Access-Control-Allow-Origin: *</code>) ali pa poskusite posodobiti URL povezave v dokumentaciji.
            </p>
          </div>
        </div>
      )}

      {/* 4. SUCCESS RESULTS STATE */}
      {searchState === 'success' && (
        <div className="flex-1 p-5 md:p-6 space-y-6 bg-white/40 overflow-y-auto max-h-[640px] md:max-h-[720px] custom-scrollbar">
          
          {/* Quick flight Connection summary banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden border border-white/10">
            <div className="absolute right-0 bottom-0 translate-x-6 translate-y-6 opacity-10">
              <Plane className="w-32 h-32 transform -rotate-12" />
            </div>

            <div className="space-y-1 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-500 text-white font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Potovalni načrt
                </span>
                <span className="text-[11px] text-slate-300 font-bold flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {formState.dates.outboundDate || 'Ni določen odhod'}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1 font-bold">
                <span className="text-sm font-extrabold text-blue-300">{formState.route.originCity || 'Ljubljana'}</span>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm font-extrabold text-blue-300">{formState.route.destinationCity || 'London'}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 relative z-10 shrink-0 border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-4 w-full sm:w-auto">
              <div className="text-center sm:text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Potniki</span>
                <span className="text-xs font-black text-white">{formState.passengers.numberOfPassengers} x {formState.passengers.cabinClass}</span>
              </div>
            </div>
          </div>

          {/* VISUAL FLIGHT CARDS (extracted dynamically) */}
          {parsedFlights.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-blue-600" /> Predlagane Letalske Povezave (Izluščeno)
                </span>
                <span className="text-[10px] text-slate-400 font-semibold italic">Kartice so generirane avtomatično</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {parsedFlights.map((flight, idx) => (
                  <div 
                    key={idx}
                    className="bg-white rounded-2xl p-4 border border-slate-150/70 hover:border-blue-300 shadow-xs hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between"
                  >
                    {/* Airline Badge & Price */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-slate-900 block group-hover:text-blue-600 transition-colors">
                          {flight.airline}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold font-mono tracking-tight block">
                          {flight.departureTime || 'Preveri vozni red'}
                        </span>
                      </div>
                      <div className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-black rounded-xl border border-blue-100 shadow-2xs">
                        {flight.price}
                      </div>
                    </div>

                    {/* Route Arrow Indicator */}
                    <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>{flight.route}</span>
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-500 font-semibold shrink-0">
                        {flight.duration}
                      </span>
                    </div>

                    {/* Background visual strip */}
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500/80 rounded-r-2xl transform opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI SUMMARY DETAILED RESPONSE COPIES */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
              Podrobno letalsko poročilo asistenta
            </span>
            <div className="bg-white/95 border border-slate-150 rounded-2xl p-5 md:p-6 shadow-sm leading-relaxed text-slate-800">
              <div className="prose prose-sm max-w-none text-slate-700">
                {formatResultsText(resultsText)}
              </div>
            </div>
          </div>

          {/* RESET FOOTER BUTTON */}
          <div className="pt-4 border-t border-slate-200/50 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Rezultati so posodobljeni. Hvaležni za zaupanje!
            </div>
            <button
              type="button"
              onClick={onReset}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs tracking-tight shadow-md hover:shadow-lg shadow-blue-500/10 transition-all cursor-pointer select-none text-center active:scale-98"
            >
              Nova poizvedba
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
