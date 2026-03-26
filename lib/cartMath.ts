import { CartItem, CartState } from "./types";

export function calculateSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
}

export function calculateTotal(state: CartState) {
  const subtotal = calculateSubtotal(state.items);
  const discountValue =
    state.discountType === "PERCENT"
      ? (subtotal * state.discount) / 100
      : state.discount;
  const total = Math.max(subtotal - discountValue, 0);
  return { subtotal, discountValue, total };
}
