import * as cheerio from "cheerio";
import type { EmailParser, ParsedEmailReceipt } from "./types";

export const lyftParser: EmailParser = {
  id: "lyft",

  canParse(senderEmail: string, subject: string) {
    return (
      senderEmail.toLowerCase().includes("@lyft.com") &&
      /ride|receipt|trip/i.test(subject)
    );
  },

  parse(html: string, plainText: string, subject: string): ParsedEmailReceipt | null {
    if (html) {
      const result = parseHtml(html);
      if (result) return result;
    }
    return parsePlainText(plainText);
  },
};

function parseHtml(html: string): ParsedEmailReceipt | null {
  const $ = cheerio.load(html);
  const bodyText = $.text();

  let total = 0;
  let subtotal = 0;
  let tax = 0;
  let tip = 0;
  let fees = 0;
  let rideDate = "";
  let cardLast4: string | null = null;
  let distance: string | null = null;
  let duration: string | null = null;
  let pickup: string | null = null;
  let dropoff: string | null = null;
  let rideType = "Lyft";

  // Total / charged amount
  const totalMatch =
    bodyText.match(/(?:total|charged|amount)[:\s]*\$(\d+\.\d{2})/i) ??
    bodyText.match(/\$(\d+\.\d{2})\s*(?:total|charged)/i);
  if (totalMatch) total = parseFloat(totalMatch[1]);

  // Ride fare / subtotal
  const subtotalMatch =
    bodyText.match(/(?:ride\s*(?:fare|charge)|subtotal|base\s*(?:fare|charge))[:\s]*\$(\d+\.\d{2})/i) ??
    bodyText.match(/(?:lyft\s*(?:fare|charge))[:\s]*\$(\d+\.\d{2})/i);
  if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1]);

  // Tax
  const taxMatch = bodyText.match(/tax(?:es)?[:\s]*\$(\d+\.\d{2})/i);
  if (taxMatch) tax = parseFloat(taxMatch[1]);

  // Tip
  const tipMatch = bodyText.match(/(?:driver\s*)?tip[:\s]*\$(\d+\.\d{2})/i);
  if (tipMatch) tip = parseFloat(tipMatch[1]);

  // Service / booking / trust & safety fees
  const serviceFeeMatch = bodyText.match(/(?:service|booking)\s*fee[:\s]*\$(\d+\.\d{2})/i);
  const trustFeeMatch = bodyText.match(/(?:trust|safety)[:\s&]*(?:safety)?[:\s]*fee[:\s]*\$(\d+\.\d{2})/i);
  if (serviceFeeMatch) fees += parseFloat(serviceFeeMatch[1]);
  if (trustFeeMatch) fees += parseFloat(trustFeeMatch[1]);

  // Additional fees (prime time, surge)
  const primeTimeMatch = bodyText.match(/(?:prime\s*time|surge)[:\s]*\+?\$(\d+\.\d{2})/i);
  if (primeTimeMatch) fees += parseFloat(primeTimeMatch[1]);

  // Ride type (Lyft, Lyft XL, Lux, Shared, etc.)
  const rideTypeMatch = bodyText.match(/(?:ride\s*type|your)\s+(lyft\s*\w*)/i) ??
    bodyText.match(/(lyft\s*(?:xl|lux|shared|black|pink|comfort|priority|wait\s*&\s*save))/i);
  if (rideTypeMatch) rideType = rideTypeMatch[1].trim();

  // Distance
  const distMatch = bodyText.match(/(\d+\.?\d*)\s*(?:mi|miles)/i);
  if (distMatch) distance = distMatch[1];

  // Duration
  const durMatch = bodyText.match(/(\d+)\s*(?:min|minutes)/i);
  if (durMatch) duration = durMatch[1];

  // Pickup / dropoff
  const pickupMatch = bodyText.match(/(?:pick\s*up|picked\s*up\s*(?:at|from))[:\s]*(.+?)(?:\n|drop|$)/i);
  if (pickupMatch) pickup = pickupMatch[1].trim().slice(0, 100);

  const dropoffMatch = bodyText.match(/(?:drop\s*off|dropped\s*off\s*(?:at|to))[:\s]*(.+?)(?:\n|$)/i);
  if (dropoffMatch) dropoff = dropoffMatch[1].trim().slice(0, 100);

  // Date
  const dateMatch =
    bodyText.match(/(\w+ \d{1,2},? \d{4})/i) ??
    bodyText.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  if (dateMatch) rideDate = dateMatch[1];

  // Card
  const cardMatch =
    bodyText.match(/ending\s*in\s*(\d{4})/i) ??
    bodyText.match(/\*{3,}(\d{4})/);
  if (cardMatch) cardLast4 = cardMatch[1];

  if (total === 0) return null;

  // Build the ride item description
  const rideParts: string[] = [rideType, "ride"];
  if (distance) rideParts.push(`(${distance} mi)`);
  if (duration) rideParts.push(`(${duration} min)`);
  const rideName = rideParts.join(" ").replace(/\s+/g, " ").trim();

  // Build location string from pickup/dropoff
  let location: string | null = null;
  if (pickup && dropoff) {
    location = `${pickup} -> ${dropoff}`;
  } else if (pickup) {
    location = pickup;
  } else if (dropoff) {
    location = dropoff;
  }

  // If we don't have subtotal, calculate from total minus extras
  if (!subtotal) subtotal = total - tax - tip - fees;
  if (subtotal < 0) subtotal = 0;

  const items: ParsedEmailReceipt["items"] = [
    {
      rawName: rideName,
      name: rideName,
      quantity: 1,
      unitPrice: subtotal,
      totalPrice: subtotal,
      category: "Transportation",
    },
  ];

  return {
    merchant: {
      rawName: "Lyft",
      canonicalName: "Lyft",
      category: "Transportation",
      location,
    },
    purchase: {
      purchasedAt: rideDate ? new Date(rideDate).toISOString() : new Date().toISOString(),
      currency: "USD",
      subtotal,
      tax,
      tip,
      discount: 0,
      fees,
      total,
    },
    payment: {
      method: "card",
      cardLast4,
      walletType: null,
      entryMode: null,
    },
    items,
    metadata: {
      confidence: 0.9,
      requiresReview: false,
    },
  };
}

function parsePlainText(text: string): ParsedEmailReceipt | null {
  if (!text) return null;

  let total = 0;
  let subtotal = 0;
  let tax = 0;
  let tip = 0;
  let fees = 0;
  let rideDate = "";
  let cardLast4: string | null = null;
  let distance: string | null = null;

  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Total
    const totalMatch = trimmed.match(/(?:total|charged|amount)[:\s]*\$(\d+\.\d{2})/i);
    if (totalMatch) total = parseFloat(totalMatch[1]);

    // Subtotal / ride fare
    const subtotalMatch = trimmed.match(/(?:ride\s*(?:fare|charge)|subtotal|base\s*(?:fare|charge))[:\s]*\$(\d+\.\d{2})/i);
    if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1]);

    // Tax
    const taxMatch = trimmed.match(/tax(?:es)?[:\s]*\$(\d+\.\d{2})/i);
    if (taxMatch) tax = parseFloat(taxMatch[1]);

    // Tip
    const tipMatch = trimmed.match(/(?:driver\s*)?tip[:\s]*\$(\d+\.\d{2})/i);
    if (tipMatch) tip = parseFloat(tipMatch[1]);

    // Fee
    const feeMatch = trimmed.match(/(?:service|booking)\s*fee[:\s]*\$(\d+\.\d{2})/i);
    if (feeMatch) fees += parseFloat(feeMatch[1]);

    // Distance
    const distMatch = trimmed.match(/(\d+\.?\d*)\s*(?:mi|miles)/i);
    if (distMatch) distance = distMatch[1];

    // Date
    const dateMatch = trimmed.match(/(\w+ \d{1,2},? \d{4})/i) ??
      trimmed.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (dateMatch && !rideDate) rideDate = dateMatch[1];

    // Card
    const cardMatch = trimmed.match(/ending\s*in\s*(\d{4})/i) ??
      trimmed.match(/\*{3,}(\d{4})/);
    if (cardMatch) cardLast4 = cardMatch[1];
  }

  if (total === 0) return null;

  if (!subtotal) subtotal = total - tax - tip - fees;
  if (subtotal < 0) subtotal = 0;

  const rideName = distance ? `Lyft ride (${distance} mi)` : "Lyft ride";

  const items: ParsedEmailReceipt["items"] = [
    {
      rawName: rideName,
      name: rideName,
      quantity: 1,
      unitPrice: subtotal,
      totalPrice: subtotal,
      category: "Transportation",
    },
  ];

  return {
    merchant: {
      rawName: "Lyft",
      canonicalName: "Lyft",
      category: "Transportation",
      location: null,
    },
    purchase: {
      purchasedAt: rideDate ? new Date(rideDate).toISOString() : new Date().toISOString(),
      currency: "USD",
      subtotal,
      tax,
      tip,
      discount: 0,
      fees,
      total,
    },
    payment: {
      method: "card",
      cardLast4,
      walletType: null,
      entryMode: null,
    },
    items,
    metadata: {
      confidence: 0.85,
      requiresReview: false,
    },
  };
}
