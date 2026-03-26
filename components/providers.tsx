"use client";

import { Toaster } from "sonner";
import CartProvider from "./cart-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
      <Toaster richColors closeButton />
    </CartProvider>
  );
}
