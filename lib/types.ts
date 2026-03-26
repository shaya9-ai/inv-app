export type DiscountType = "AMOUNT" | "PERCENT";

export type CartItem = {
  id: number;
  name: string;
  category?: string;
  unit?: string;
  price: number; // editable unit price
  basePrice?: number;
  quantity: number;
};

export type CartState = {
  items: CartItem[];
  discount: number;
  discountType: DiscountType;
  customerName: string;
  customerPhone: string;
};

export type InvoiceItemPayload = {
  productId: number;
  name: string;
  unit?: string;
  quantity: number;
  price: number;
};
