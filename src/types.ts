export type Gender = "men" | "women";

export type Colorway = { name: string; hex: string };

export type GarmentType = "top" | "outer" | "dress" | "bottom" | "accessory";

export type AnchorPoints = {
  shoulder?: { x: number; y: number };
  hip?: { x: number; y: number };
  hem?: { x: number; y: number };
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  gender: Gender;
  category: string;
  price: number;
  compareAt?: number;
  rating: number;
  reviews: number;
  colors: Colorway[];
  sizes: string[];
  images: string[];
  description: string;
  fabric: string;
  details: string[];
  trending?: boolean;
  newest?: boolean;
  bestseller?: boolean;
  season?: "Evening" | "Winter";
  stock: number;
  archived?: boolean;
  overlayImage?: string;
  tryOnImage?: string;
  garmentMask?: string;
  anchorPoints?: AnchorPoints;
  garmentType?: GarmentType;
};

export type CartLine = {
  id: string;
  productId: string;
  size: string;
  color: string;
  qty: number;
};

export type Look = {
  id: string;
  photo: string;
  result: string;
  productId: string;
  color: string;
  size: string;
  createdAt: number;
};

export type SavedPhoto = {
  id: string;
  src: string;
  label: string;
  createdAt: number;
};

export type Board = {
  id: string;
  name: string;
  lookIds: string[];
};

export type OrderItem = {
  productId: string;
  name: string;
  image: string;
  size: string;
  color: string;
  qty: number;
  price: number;
};

export type OrderStatus = "Placed" | "Processing" | "Shipped" | "Delivered";

export type Order = {
  id: string;
  placedAt: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  method: string;
  address: string;
  email: string;
};

export type Profile = {
  name: string;
  email: string;
  phone: string;
  birthday: string;
  memberSince: string;
  tier: string;
  notifyOrders: boolean;
  notifyLooks: boolean;
  notifyLetters: boolean;
};

export type Address = {
  id: string;
  label: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal: string;
  country: string;
  phone: string;
};

export type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  exp: string;
  name: string;
};

export type Coupon = {
  code: string;
  type: "percent" | "amount";
  value: number;
  active: boolean;
  note: string;
};

export type TryEvent = {
  id: string;
  productId: string;
  at: number;
};

export type Review = {
  name: string;
  meta: string;
  title: string;
  text: string;
  rating: number;
};

export type Toast = {
  id: string;
  message: string;
  tone: "ok" | "err";
};
