export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location extends Coordinates {
  name: string;
}
