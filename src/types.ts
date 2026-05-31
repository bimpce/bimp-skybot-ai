export type CabinClassType = 'economy' | 'premium economy' | 'business' | 'first';
export type TripTypeType = 'one-way' | 'round-trip';

export interface RouteState {
  originCity: string;
  destinationCity: string;
}

export interface DatesState {
  outboundDate: string; // YYYY-MM-DD
  returnDate: string | null; // YYYY-MM-DD or null
  tripType: TripTypeType;
}

export interface PassengersState {
  numberOfPassengers: number;
  cabinClass: CabinClassType;
}

export interface FlexibilityState {
  flexibleDays: number; // 0, 1, 2, 3
  willingToAddStopovers: boolean;
  carryOnOnly: boolean;
}

export interface FlightSearchFormState {
  route: RouteState;
  dates: DatesState;
  passengers: PassengersState;
  flexibility: FlexibilityState;
}

export interface MessagePayload {
  sessionId: string;
  timestamp: string; // ISO 8601 string
  message: string;
  language: 'sl';
  route: RouteState;
  dates: DatesState;
  passengers: PassengersState;
  flexibility: FlexibilityState;
}

export interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  isError?: boolean;
}
