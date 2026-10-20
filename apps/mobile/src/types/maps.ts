export type MapPoint = {
  id: string;
  title: string;
  amount: number;
  amountLabel?: string;
  address: string;
  createdAt: string;
  lat: number;
  lng: number;
  status: { key: string; label: string; color: string };
};

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapCanvasProps = {
  points: MapPoint[];
  region: MapRegion;
  onSelect: (point: MapPoint) => void;
  formatMoney: (value: number) => string;
  height?: number;
  valuePrefix?: string;
  selectedId?: string | null;
  focusKey?: number;
};
