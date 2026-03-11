export interface Farmer {
  id: string;
  name: string;
  mobile: string;
  pin: string;
  createdAt: string;
}

export interface VegetableItem {
  id: string;
  farmerId: string;
  farmerName: string;
  name: string;
  quantity: number;
  price: number;
  cultivationDate: string;
  location: string;
  photoUrl?: string;
  createdAt: string;
  soldCount: number;
}

export interface Sale {
  id: string;
  itemId: string;
  farmerId: string;
  customerName: string;
  customerMobile: string;
  quantity: number;
  totalPrice: number;
  date: string;
}
