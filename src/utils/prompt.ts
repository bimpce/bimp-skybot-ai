import { FlightSearchFormState } from '../types';

/**
 * Generates a clean, friendly Slovenian prompt for the chatbot based on search parameters.
 */
export function generatePromptFromState(state: FlightSearchFormState): string {
  const { route, dates, passengers, flexibility } = state;
  
  const origin = route.originCity.trim() || 'Ljubljana';
  const destination = route.destinationCity.trim() || 'London';
  
  // Date formatting
  const outbound = dates.outboundDate || '2026-06-10';
  let dateText = `Odhod: ${outbound}`;
  if (dates.tripType === 'round-trip') {
    const returnD = dates.returnDate || '2026-06-17';
    dateText += `, povratek: ${returnD}`;
  } else {
    dateText += ` (enosmerno potovanje)`;
  }

  // Cabin class Slovene names
  let cabinName = 'ekonomskem';
  if (passengers.cabinClass === 'premium economy') {
    cabinName = 'premium ekonomskem';
  } else if (passengers.cabinClass === 'business') {
    cabinName = 'poslovnem';
  } else if (passengers.cabinClass === 'first') {
    cabinName = 'prvem';
  }

  // Flexibility info
  const flexDays = flexibility.flexibleDays;
  let flexText = '(točni datumi)';
  if (flexDays > 0) {
    flexText = `(prilagodljivo ±${flexDays} dni)`;
  }

  // Baggage & Stopover info
  const stopoverText = flexibility.willingToAddStopovers 
    ? 'Dovoli lete s prestopi.' 
    : 'Želim čim bolj direktne lete brez prestopanja.';
    
  const baggageText = flexibility.carryOnOnly 
    ? 'Potujem samo z ročno prtljago.' 
    : 'Vključena je lahko tudi oddana prtljaga.';

  const emailText = state.email && state.email.trim()
    ? `\n📧 Prosim, pošlji končne letalske ponudbe tudi na e-poštni naslov: ${state.email.trim()}\n`
    : '';

  return `Pozdravljen! Iščem letalske povezave s spodnjimi podatki:\n\n` +
         `🛫 Odhod: ${origin}\n` +
         `🛬 Destinacija: ${destination}\n` +
         `📅 Datumi: ${dateText} ${flexText}\n` +
         `👥 Potniki: ${passengers.numberOfPassengers} x v ${cabinName} razredu\n` +
         `💼 Prtljaga & Prestopi: ${baggageText} ${stopoverText}\n` +
         emailText +
         `\nProsim, preveri najboljše razpoložljive lete v sistemu in mi predlagaj ugodne povezave!`;
}
