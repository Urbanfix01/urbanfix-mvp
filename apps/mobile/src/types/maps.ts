export type MapPoint = {
  id: string;
  title: string;
  amount: number;
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
