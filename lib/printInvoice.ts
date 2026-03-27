"use client";

import { format } from "date-fns";
import { calculateTotal } from "./cartMath";
import scanmeImage from "../public/scanme.png";
import logoImage from "../public/logo.png";

const LOGO_VECTOR_SRC = "/logo.ai";
const LOGO_FALLBACK_SRC = logoImage.src;

interface InvoiceData {
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  parsedItems: any[];
  discount: number;
  discountType: string;
  createdAt: string;
}

interface ReceiptData {
  receiptNumber: string;
  supplierName?: string;
  date: string;
  items: Array<{ name: string; unit?: string; quantity: number; price: number }>;
  subtotal: number;
  discount: number;
  discountType: string;
  total: number;
  note?: string;
}

export function openInvoicePrint(inv: InvoiceData) {
  const receiptMode = window.confirm("Use 80mm receipt mode? Cancel = A4");
  const pageCss = receiptMode
    ? `
      @page { size: 80mm auto; margin: 0; }
      body { width: 80mm !important; margin: 0 !important; padding: 1.5mm !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; zoom: 200%; }
    `
    : `
      @page { size: A4 portrait; margin: 80mm; }
      body { max-width: 190mm; margin: 80mm; }
    `;

  const numbers = calculateTotal({
    items: inv.parsedItems as any,
    discount: inv.discount,
    discountType: inv.discountType as any,
    customerName: inv.customerName,
    customerPhone: inv.customerPhone ?? "",
  });

  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <title>Invoice #${inv.invoiceNumber}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; image-rendering: crisp-edges; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            padding: 0; 
            margin: 0;
            color: #000; 
            background: white;
            line-height: 1.1;
            font-weight: 700;
          }
          table { width: 100%; border-collapse: collapse; margin: 3pt 0; border: 2pt solid #000; }
          td, th { border: 2pt solid #000; padding: 2pt 2pt; font-size: 10pt; text-align: left; line-height: 1.1; font-weight: 700; }
          th { font-weight: bold; background: #000; color: #fff; }
          .header { margin-bottom: 2pt; text-align: center; border-bottom: 3pt solid #000; padding-bottom: 2pt; }
          .header svg { margin: 0 auto 2pt; }
          .invoice-title { font-size: 12pt; font-weight: bold; margin: 0; }
          .company { font-size: 15pt; margin: 6pt 0; font-weight: 700; }
          .customer { font-size: 9pt; margin: 1pt 0; font-weight: 700; }
          .invoice-num { font-size: 9pt; margin: 1pt 0; font-weight: bold; }
          .date { font-size: 9pt; margin: 1pt 0; font-weight: bold; }
          .totals { margin: 2pt 0; font-size: 10pt; border-top: 3pt solid #000; padding-top: 2pt; }
          .total-row { text-align: right; font-weight: bold; }
          .discount { text-align: right; font-size: 9pt; font-weight: 700; }
          .grand-total { text-align: right; font-weight: bold; font-size: 11pt; border-top: 3pt solid #000; margin-top: 1pt; padding-top: 2pt; }
          .footer { font-size: 8pt; margin-top: 3pt; line-height: 1.1; text-align: center; font-weight: 700; border-top: 3pt solid #000; padding-top: 2pt; }
          .footer p { margin: 1pt 0; }
          .footer img { margin: 4pt auto; display: block; border: none; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .terms { font-size: 7pt; margin-top: 2pt; line-height: 1.08; text-align: left; }
          .terms strong { font-weight: bold; }
          .terms ul { margin: 1pt 0 0 0; padding: 0; list-style-type: none; }
          .terms li { margin: 0.5pt 0; padding-left: 6pt; position: relative; }
          .terms li:before { content: "•"; position: absolute; left: 0; }
          @media print {
            ${pageCss}
          }
        </style>
        </head>
        <body>
          <div class="header">
            <img src="${LOGO_VECTOR_SRC}" onerror="this.onerror=null;this.src='${LOGO_FALLBACK_SRC}'" alt="Logo" style="width: 140px; height: auto; margin: 0 auto 4pt; display: block; image-rendering: optimizeQuality;" />
            <div class="company">S•PRINT TECH MOBILE</div>
            <div class="company">ACCESSORIES</div>
            <div class="invoice-num">#${inv.invoiceNumber}</div>
            <div class="date">${format(inv.createdAt, "dd MMM yyyy, HH:mm")}</div>
            ${inv.customerName ? `<div class="customer"><strong>${inv.customerName}</strong></div>` : ""}
          ${inv.customerPhone ? `<div class="customer">Ph: ${inv.customerPhone}</div>` : ""}
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:15%; text-align: center;">Qty</th>
              <th style="width:50%; text-align: left;">Product</th>
              <th style="width:17%; text-align: right;">Price</th>
              <th style="width:18%; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${inv.parsedItems
              .map(
                (it: any) =>
                  `<tr>
                    <td style="text-align: center;">${it.quantity}x</td>
                    <td>${it.name}${it.unit ? ` (${it.unit})` : ""}</td>
                    <td style="text-align: right;">Rs${it.price}</td>
                    <td style="text-align: right;">Rs${(it.price * it.quantity).toFixed(0)}</td>
                  </tr>`
              )
              .join("")}
          </tbody>
        </table>
        <div class="totals">
          <div class="total-row">Subtotal: Rs ${numbers.subtotal.toFixed(0)}</div>
          ${inv.discount > 0 ? `<div class="discount">Discount: ${inv.discount}${inv.discountType === "PERCENT" ? "%" : ""}</div>` : ""}
          <div class="grand-total">Total: Rs ${numbers.total.toFixed(0)}</div>
        </div>
        <div class="footer">
          <p>Thank you for business!</p>
          <p>Luckyone Mall, Karachi</p>
          <p>Ph: 03012276178</p>
          <h6>We love to hear your feedback!</h6>
          <h6>Scan the QR Code to write a review</h6>
          <img src="${scanmeImage.src}" alt="QR Code" style="width: 150px; height: auto; margin: 8pt auto; border: none; padding: 0;" />
          <div class="terms">
            <strong>Terms & Conditions:</strong>
            <ul>
              <li>Items can be exchanged for equal or higher value at any store location.</li>
              <li>Original receipt is required for exchange within 7 days of purchase.</li>
              <li>Products must be unused and in original condition with packaging.</li>
              <li>Refunds are only processed at the original store of purchase.</li>
              <li>Items bought at full price will be exchanged at the current price.</li>
              <li>Items without proper packaging (e.g., box) will not be accepted for exchange.</li>
            </ul>
            <strong>Helpline:</strong>
            <li>In case of any issue kindly contact us at :<strong>03012276178</strong>.</li>
          </div>
          <div class="footer">
            <p>----------------------</p>
            <p>Powered by VNE Digital</p>
            <p>www.vnedigital.com</p>
          </div>
        </body>
      </html>
  `);
  win.document.close();
  win.print();
}

export function openGrnPrint(rec: ReceiptData) {
  const receiptMode = window.confirm("Use 80mm receipt mode? Cancel = A4");
  const pageCss = receiptMode
    ? `
      @page { size: 80mm auto; margin: 0; }
      body { width: 80mm !important; margin: 0 !important; padding: 1.5mm !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; zoom: 200%; }
    `
    : `
      @page { size: A4 portrait; margin: 80mm; }
      body { max-width: 190mm; margin: 80mm; }
    `;

  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <title>GRN #${rec.receiptNumber}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; image-rendering: crisp-edges; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            padding: 0; 
            margin: 0;
            color: #000; 
            background: white;
            line-height: 1.1;
            font-weight: 700;
          }
          table { width: 100%; border-collapse: collapse; margin: 3pt 0; border: 2pt solid #000; }
          td, th { border: 2pt solid #000; padding: 2pt 2pt; font-size: 10pt; text-align: left; line-height: 1.1; font-weight: 700; }
          th { font-weight: bold; background: #000; color: #fff; }
          .header { margin-bottom: 2pt; text-align: center; border-bottom: 3pt solid #000; padding-bottom: 2pt; }
          .invoice-title { font-size: 12pt; font-weight: bold; margin: 0; }
          .company { font-size: 15pt; margin: 6pt 0; font-weight: 700; }
          .supplier { font-size: 9pt; margin: 1pt 0; font-weight: 700; }
          .receipt-num { font-size: 9pt; margin: 1pt 0; font-weight: bold; }
          .date { font-size: 9pt; margin: 1pt 0; font-weight: bold; }
          .totals { margin: 2pt 0; font-size: 10pt; border-top: 3pt solid #000; padding-top: 2pt; }
          .total-row { text-align: right; font-weight: bold; }
          .grand-total { text-align: right; font-weight: bold; font-size: 11pt; border-top: 3pt solid #000; margin-top: 1pt; padding-top: 2pt; }
          .footer { font-size: 8pt; margin-top: 3pt; line-height: 1.1; text-align: center; font-weight: 700; border-top: 3pt solid #000; padding-top: 2pt; }
          .footer p { margin: 1pt 0; }
          .note { font-size: 8pt; margin-top: 2pt; padding-top: 2pt; border-top: 3pt solid #000; }
          @media print {
            ${pageCss}
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${LOGO_VECTOR_SRC}" onerror="this.onerror=null;this.src='${LOGO_FALLBACK_SRC}'" alt="Logo" style="width: 140px; height: auto; margin: 0 auto 4pt; display: block; image-rendering: optimizeQuality;" />
          <div class="company">S•PRINT TECH MOBILE</div>
          <div class="company">ACCESSORIES</div>
          <div class="invoice-title">GOODS RECEIPT NOTE (GRN)</div>
          <div class="receipt-num">#${rec.receiptNumber}</div>
          <div class="date">${format(rec.date, "dd MMM yyyy, HH:mm")}</div>
          ${rec.supplierName ? `<div class="supplier"><strong>Supplier: ${rec.supplierName}</strong></div>` : ""}
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:15%; text-align: center;">Qty</th>
              <th style="width:50%; text-align: left;">Product</th>
              <th style="width:17%; text-align: right;">Price</th>
              <th style="width:18%; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rec.items
              .map(
                (it) =>
                  `<tr>
                    <td style="text-align: center;">${it.quantity}x</td>
                    <td>${it.name}${it.unit ? ` (${it.unit})` : ""}</td>
                    <td style="text-align: right;">Rs${it.price}</td>
                    <td style="text-align: right;">Rs${(it.price * it.quantity).toFixed(0)}</td>
                  </tr>`
              )
              .join("")}
          </tbody>
        </table>
        <div class="totals">
          <div class="total-row">Subtotal: Rs ${rec.subtotal.toFixed(0)}</div>
          ${rec.discount > 0 ? `<div style="text-align: right;">Discount: ${rec.discount}${rec.discountType === "PERCENT" ? "%" : ""}</div>` : ""}
          <div class="grand-total">Total: Rs ${rec.total.toFixed(0)}</div>
        </div>
        ${rec.note ? `<div class="note"><strong>Note:</strong> ${rec.note}</div>` : ""}
        <div class="footer">
          <p>Stock received and verified</p>
          <p>----------------------</p>
          <p>Powered by VNE Digital</p>
          <p>www.vnedigital.com</p>
        </div>
      </body>
    </html>
  `);
  win.document.close();
  win.print();
}
