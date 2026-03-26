"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CartItem, CartState, DiscountType } from "../lib/types";
import { calculateTotal } from "../lib/cartMath";

type CartContextValue = {
  state: CartState;
  addItem: (item: CartItem) => void;
  removeItem: (id: number) => void;
  updateQty: (id: number, qty: number) => void;
  updatePrice: (id: number, price: number) => void;
  clear: () => void;
  setDiscount: (value: number, type?: DiscountType) => void;
  setCustomer: (name: string, phone: string) => void;
  totals: { subtotal: number; discountValue: number; total: number };
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "inv_cart_state";

const defaultState: CartState = {
  items: [],
  discount: 0,
  discountType: "AMOUNT",
  customerName: "",
  customerPhone: "",
};

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>(defaultState);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setState(JSON.parse(stored));
      } catch {
        setState(defaultState);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const totals = useMemo(() => calculateTotal(state), [state]);

  const value: CartContextValue = {
    state,
    totals,
    addItem: (item) =>
      setState((prev) => {
        const existing = prev.items.find((p) => p.id === item.id);
        if (existing) {
          return {
            ...prev,
            items: prev.items.map((p) =>
              p.id === item.id
                ? { ...p, quantity: p.quantity + item.quantity }
                : p
            ),
          };
        }
        return { ...prev, items: [...prev.items, item] };
      }),
    removeItem: (id) =>
      setState((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) })),
    updateQty: (id, qty) =>
      setState((prev) => ({
        ...prev,
        items: prev.items.map((i) => (i.id === id ? { ...i, quantity: Math.max(qty, 0) } : i)),
      })),
    updatePrice: (id, price) =>
      setState((prev) => ({
        ...prev,
        items: prev.items.map((i) => (i.id === id ? { ...i, price: Math.max(price, 0) } : i)),
      })),
    clear: () => setState(defaultState),
    setDiscount: (value, type) =>
      setState((prev) => ({
        ...prev,
        discount: Math.max(value, 0),
        discountType: type ?? prev.discountType,
      })),
    setCustomer: (name, phone) =>
      setState((prev) => ({ ...prev, customerName: name, customerPhone: phone })),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
