"use client";

import { Toaster } from "sonner";
import CartProvider from "./cart-provider";
import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CartProvider>
        {children}
        <Toaster richColors closeButton />
      </CartProvider>
    </ThemeProvider>
  );
}
