type Item = { quantity: number; price: number };

export function calculateTotals(items: Item[], discount: number, discountType: "AMOUNT" | "PERCENT") {
  const subtotal = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.price), 0);
  const discountValue = discountType === "PERCENT" ? (subtotal * Number(discount ?? 0)) / 100 : Number(discount ?? 0);
  const total = Math.max(subtotal - discountValue, 0);
  return { subtotal, discountValue, total };
}
