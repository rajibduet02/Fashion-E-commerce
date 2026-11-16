import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CATALOG,
  SAMPLE_PHOTOS,
  seedAddresses,
  seedCards,
  seedCoupons,
  seedOrders,
  seedProfile,
} from "./data";
import type {
  Address,
  Board,
  CartLine,
  Coupon,
  Look,
  Order,
  OrderStatus,
  Product,
  Profile,
  SavedCard,
  SavedPhoto,
  Toast,
  TryEvent,
} from "./types";

const KEY = "aurelle.v2";

type Overrides = Record<
  string,
  {
    stock?: number;
    archived?: boolean;
    overlayImage?: string;
    tryOnImage?: string;
    garmentMask?: string;
    garmentType?: Product["garmentType"];
    anchorPoints?: Product["anchorPoints"];
  }
>;

type Persisted = {
  cart: CartLine[];
  wishlist: string[];
  looks: Look[];
  photos: SavedPhoto[];
  boards: Board[];
  orders: Order[];
  profile: Profile;
  addresses: Address[];
  payments: SavedCard[];
  coupons: Coupon[];
  hiddenCategories: string[];
  tryOns: TryEvent[];
  overrides: Overrides;
  extra: Product[];
  promo: string | null;
};

function readSaved(): Partial<Persisted> | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persisted;
  } catch {
    return null;
  }
}

type Store = {
  products: Product[];
  cart: CartLine[];
  wishlist: string[];
  looks: Look[];
  photos: SavedPhoto[];
  boards: Board[];
  orders: Order[];
  profile: Profile;
  addresses: Address[];
  payments: SavedCard[];
  coupons: Coupon[];
  hiddenCategories: string[];
  tryOns: TryEvent[];
  promo: string | null;
  activeCoupon: Coupon | null;
  cartOpen: boolean;
  toasts: Toast[];
  setCartOpen: (open: boolean) => void;
  toast: (message: string, tone?: "ok" | "err") => void;
  dismissToast: (id: string) => void;
  addToCart: (input: { productId: string; size: string; color: string; qty?: number }) => void;
  updateQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  toggleWish: (productId: string) => void;
  addLook: (look: Look) => void;
  removeLook: (id: string) => void;
  addPhoto: (photo: SavedPhoto) => void;
  removePhoto: (id: string) => void;
  addBoard: (name: string) => void;
  removeBoard: (id: string) => void;
  assignLook: (boardId: string, lookId: string) => void;
  placeOrder: (order: Order) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  updateProfile: (profile: Profile) => void;
  addAddress: (address: Address) => void;
  removeAddress: (id: string) => void;
  addPayment: (card: SavedCard) => void;
  removePayment: (id: string) => void;
  updateStock: (id: string, stock: number) => void;
  setArchived: (id: string, archived: boolean) => void;
  addProduct: (product: Product) => void;
  setGarmentAsset: (
    id: string,
    asset: Partial<Pick<Product, "overlayImage" | "tryOnImage" | "garmentMask" | "garmentType" | "anchorPoints">>,
  ) => void;
  toggleCategory: (key: string) => void;
  addCoupon: (coupon: Coupon) => boolean;
  toggleCoupon: (code: string) => void;
  removeCoupon: (code: string) => void;
  applyPromo: (code: string) => boolean;
  clearPromo: () => void;
  recordTryOn: (productId: string) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const saved = useRef(readSaved()).current;
  const [cart, setCart] = useState<CartLine[]>(saved?.cart ?? []);
  const [wishlist, setWishlist] = useState<string[]>(saved?.wishlist ?? ["w3", "m11", "w5"]);
  const [looks, setLooks] = useState<Look[]>(saved?.looks ?? []);
  const [photos, setPhotos] = useState<SavedPhoto[]>(saved?.photos ?? SAMPLE_PHOTOS);
  const [boards, setBoards] = useState<Board[]>(
    saved?.boards ?? [{ id: "board-evening", name: "Evening edits", lookIds: [] }],
  );
  const [orders, setOrders] = useState<Order[]>(saved?.orders ?? seedOrders);
  const [profile, setProfile] = useState<Profile>(saved?.profile ?? seedProfile);
  const [addresses, setAddresses] = useState<Address[]>(saved?.addresses ?? seedAddresses);
  const [payments, setPayments] = useState<SavedCard[]>(saved?.payments ?? seedCards);
  const [coupons, setCoupons] = useState<Coupon[]>(saved?.coupons ?? seedCoupons);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>(saved?.hiddenCategories ?? []);
  const [tryOns, setTryOns] = useState<TryEvent[]>(saved?.tryOns ?? []);
  const [overrides, setOverrides] = useState<Overrides>(saved?.overrides ?? {});
  const [extra, setExtra] = useState<Product[]>(saved?.extra ?? []);
  const [promo, setPromo] = useState<string | null>(saved?.promo ?? null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const products = useMemo(
    () => [...CATALOG, ...extra].map((product) => ({ ...product, ...overrides[product.id] })),
    [extra, overrides],
  );

  const productsRef = useRef(products);
  productsRef.current = products;
  const couponsRef = useRef(coupons);
  couponsRef.current = coupons;

  useEffect(() => {
    const payload: Persisted = {
      cart,
      wishlist,
      looks,
      photos,
      boards,
      orders,
      profile,
      addresses,
      payments,
      coupons,
      hiddenCategories,
      tryOns,
      overrides,
      extra,
      promo,
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(payload));
    } catch {
      setToasts((current) => [
        ...current,
        { id: crypto.randomUUID(), message: "This browser is full, so the latest save may not stick.", tone: "err" },
      ]);
    }
  }, [
    cart,
    wishlist,
    looks,
    photos,
    boards,
    orders,
    profile,
    addresses,
    payments,
    coupons,
    hiddenCategories,
    tryOns,
    overrides,
    extra,
    promo,
  ]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: "ok" | "err" = "ok") => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, message, tone }]);
      window.setTimeout(() => dismissToast(id), 3400);
    },
    [dismissToast],
  );

  const addToCart = useCallback(
    (input: { productId: string; size: string; color: string; qty?: number }) => {
      const product = productsRef.current.find((item) => item.id === input.productId);
      if (!product || product.archived) {
        toast("That piece is no longer available.", "err");
        return;
      }
      if (product.stock <= 0) {
        toast("This piece is sold out.", "err");
        return;
      }
      const qty = Math.max(1, input.qty ?? 1);
      const id = `${input.productId}__${input.size}__${input.color}`;
      setCart((lines) => {
        const existing = lines.find((line) => line.id === id);
        if (existing) {
          return lines.map((line) =>
            line.id === id ? { ...line, qty: Math.min(product.stock, line.qty + qty) } : line,
          );
        }
        return [
          ...lines,
          {
            id,
            productId: input.productId,
            size: input.size,
            color: input.color,
            qty: Math.min(product.stock, qty),
          },
        ];
      });
      setCartOpen(true);
      toast("Added to your bag.");
    },
    [toast],
  );

  const updateQty = useCallback((id: string, qty: number) => {
    setCart((lines) =>
      lines.flatMap((line) => {
        if (line.id !== id) return [line];
        const product = productsRef.current.find((item) => item.id === line.productId);
        const next = Math.min(product?.stock ?? qty, qty);
        if (next <= 0) return [];
        return [{ ...line, qty: next }];
      }),
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((lines) => lines.filter((line) => line.id !== id));
  }, []);

  const toggleWish = useCallback(
    (productId: string) => {
      setWishlist((current) => {
        if (current.includes(productId)) {
          toast("Removed from wishlist.");
          return current.filter((id) => id !== productId);
        }
        toast("Saved to wishlist.");
        return [productId, ...current];
      });
    },
    [toast],
  );

  const addLook = useCallback(
    (look: Look) => {
      setLooks((current) => [look, ...current].slice(0, 8));
      toast("Saved to My Looks.");
    },
    [toast],
  );

  const removeLook = useCallback((id: string) => {
    setLooks((current) => current.filter((look) => look.id !== id));
    setBoards((current) => current.map((board) => ({ ...board, lookIds: board.lookIds.filter((lookId) => lookId !== id) })));
  }, []);

  const addPhoto = useCallback((photo: SavedPhoto) => {
    setPhotos((current) => [photo, ...current.filter((item) => item.src !== photo.src)].slice(0, 8));
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  }, []);

  const addBoard = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setBoards((current) => [{ id: crypto.randomUUID(), name: trimmed, lookIds: [] }, ...current]);
      toast("Collection created.");
    },
    [toast],
  );

  const removeBoard = useCallback((id: string) => {
    setBoards((current) => current.filter((board) => board.id !== id));
  }, []);

  const assignLook = useCallback((boardId: string, lookId: string) => {
    setBoards((current) =>
      current.map((board) => {
        if (board.id !== boardId) return board;
        if (board.lookIds.includes(lookId)) return board;
        return { ...board, lookIds: [...board.lookIds, lookId] };
      }),
    );
  }, []);

  const placeOrder = useCallback((order: Order) => {
    setOrders((current) => [order, ...current]);
    setCart([]);
    setPromo(null);
  }, []);

  const updateOrderStatus = useCallback((id: string, status: OrderStatus) => {
    setOrders((current) => current.map((order) => (order.id === id ? { ...order, status } : order)));
  }, []);

  const updateProfile = useCallback(
    (next: Profile) => {
      setProfile(next);
      toast("Profile saved.");
    },
    [toast],
  );

  const addAddress = useCallback(
    (address: Address) => {
      setAddresses((current) => [address, ...current]);
      toast("Address saved.");
    },
    [toast],
  );

  const removeAddress = useCallback((id: string) => {
    setAddresses((current) => current.filter((address) => address.id !== id));
  }, []);

  const addPayment = useCallback(
    (card: SavedCard) => {
      setPayments((current) => [card, ...current]);
      toast("Card saved.");
    },
    [toast],
  );

  const removePayment = useCallback((id: string) => {
    setPayments((current) => current.filter((card) => card.id !== id));
  }, []);

  const updateStock = useCallback((id: string, stock: number) => {
    setOverrides((current) => ({ ...current, [id]: { ...current[id], stock: Math.max(0, stock) } }));
  }, []);

  const setArchived = useCallback((id: string, archived: boolean) => {
    setOverrides((current) => ({ ...current, [id]: { ...current[id], archived } }));
  }, []);

  const setGarmentAsset = useCallback(
    (id: string, asset: Partial<Pick<Product, "overlayImage" | "tryOnImage" | "garmentMask" | "garmentType" | "anchorPoints">>) => {
      setOverrides((current) => {
        const next = { ...current[id] };
        (Object.keys(asset) as (keyof typeof asset)[]).forEach((key) => {
          const value = asset[key];
          if (value == null || value === "") delete next[key];
          else Object.assign(next, { [key]: value });
        });
        return { ...current, [id]: next };
      });
      toast("Garment asset saved.");
    },
    [toast],
  );

  const addProduct = useCallback(
    (product: Product) => {
      setExtra((current) => [product, ...current]);
      toast("Product added to the atelier.");
    },
    [toast],
  );

  const toggleCategory = useCallback((key: string) => {
    setHiddenCategories((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }, []);

  const addCoupon = useCallback(
    (coupon: Coupon) => {
      if (couponsRef.current.some((item) => item.code.toLowerCase() === coupon.code.toLowerCase())) {
        toast("That code already exists.", "err");
        return false;
      }
      setCoupons((current) => [coupon, ...current]);
      toast("Coupon created.");
      return true;
    },
    [toast],
  );

  const toggleCoupon = useCallback((code: string) => {
    setCoupons((current) => current.map((coupon) => (coupon.code === code ? { ...coupon, active: !coupon.active } : coupon)));
  }, []);

  const removeCoupon = useCallback((code: string) => {
    setCoupons((current) => current.filter((coupon) => coupon.code !== code));
    setPromo((current) => (current === code ? null : current));
  }, []);

  const applyPromo = useCallback(
    (code: string) => {
      const found = couponsRef.current.find((coupon) => coupon.code.toLowerCase() === code.trim().toLowerCase());
      if (!found || !found.active) {
        toast("That code isn’t active.", "err");
        return false;
      }
      setPromo(found.code);
      toast(`${found.code} applied.`);
      return true;
    },
    [toast],
  );

  const clearPromo = useCallback(() => setPromo(null), []);

  const recordTryOn = useCallback((productId: string) => {
    setTryOns((current) => [{ id: crypto.randomUUID(), productId, at: Date.now() }, ...current].slice(0, 80));
  }, []);

  const activeCoupon = coupons.find((coupon) => coupon.code === promo && coupon.active) ?? null;

  const value: Store = {
    products,
    cart,
    wishlist,
    looks,
    photos,
    boards,
    orders,
    profile,
    addresses,
    payments,
    coupons,
    hiddenCategories,
    tryOns,
    promo,
    activeCoupon,
    cartOpen,
    toasts,
    setCartOpen,
    toast,
    dismissToast,
    addToCart,
    updateQty,
    removeFromCart,
    toggleWish,
    addLook,
    removeLook,
    addPhoto,
    removePhoto,
    addBoard,
    removeBoard,
    assignLook,
    placeOrder,
    updateOrderStatus,
    updateProfile,
    addAddress,
    removeAddress,
    addPayment,
    removePayment,
    updateStock,
    setArchived,
    addProduct,
    setGarmentAsset,
    toggleCategory,
    addCoupon,
    toggleCoupon,
    removeCoupon,
    applyPromo,
    clearPromo,
    recordTryOn,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const store = useContext(Ctx);
  if (!store) throw new Error("Store missing");
  return store;
}
