/**
 * Card art image URLs from issuer public marketing pages.
 * These are the same images banks show on their own websites.
 */
export const CARD_IMAGES: Record<string, string> = {
  // Chase (base: https://creditcards.chase.com)
  "chase-sapphire-preferred": "https://creditcards.chase.com/content/dam/jpmc-marketplace/card-art/sapphire_preferred_card.png",
  "chase-sapphire-reserve": "https://creditcards.chase.com/content/dam/jpmc-marketplace/card-art/sapphire_reserve_card_Halo.png",
  "chase-freedom-unlimited": "https://creditcards.chase.com/content/dam/jpmc-marketplace/card-art/freedom_unlimited_card_alt.png",
  "chase-freedom-flex": "https://creditcards.chase.com/content/dam/jpmc-marketplace/card-art/freedom_flex_card_alt.png",
  "chase-ink-business-preferred": "https://creditcards.chase.com/content/dam/jpmc-marketplace/card-art/ink_business_preferred_card.png",
  "chase-ink-business-cash": "https://creditcards.chase.com/content/dam/jpmc-marketplace/card-art/ink_cash_card.png",
  "chase-ink-business-unlimited": "https://creditcards.chase.com/content/dam/jpmc-marketplace/card-art/ink_unlimited_card.png",
  "chase-amazon-prime": "https://m.media-amazon.com/images/G/01/credit/img20/cardart/Cardart_Prime_702._CB636109498_.png",

  // Capital One (verified from their site)
  "capital-one-venture-x": "https://ecm.capitalone.com/WCM/card/products/venture-x-card-art/mobile.png",
  "capital-one-venture": "https://ecm.capitalone.com/WCM/card/products/venture_cardart_prim_323x203-1/mobile.png",
  "capital-one-savor-one": "https://ecm.capitalone.com/WCM/card/products/savorone-2025-cardart.png",
  "capital-one-savor": "https://ecm.capitalone.com/WCM/card/products/new-savor-card-art/mobile.png",
  "capital-one-quicksilver": "https://ecm.capitalone.com/WCM/card/products/quicksilver_cardart.png",

  // Amex (common CDN pattern)
  "amex-gold": "https://icm.aexp-static.com/Internet/Acquisition/US_en/AppContent/OneSite/category/cardarts/gold-card.png",
  "amex-platinum": "https://icm.aexp-static.com/Internet/Acquisition/US_en/AppContent/OneSite/category/cardarts/platinum-card.png",
  "amex-blue-cash-preferred": "https://icm.aexp-static.com/Internet/Acquisition/US_en/AppContent/OneSite/category/cardarts/blue-cash-preferred.png",
  "amex-blue-cash-everyday": "https://icm.aexp-static.com/Internet/Acquisition/US_en/AppContent/OneSite/category/cardarts/blue-cash-everyday.png",

  // Discover
  "discover-it-cash-back": "https://www.discover.com/content/dam/discover/en_us/credit-cards/card-acquisitions/grey-702702/images/cardart-workspace/cardart-workspace-it-background.png",

  // Apple
  "apple-card": "https://www.apple.com/v/apple-card/d/images/overview/titanium_card__f5b1kara2boy_large.png",
};

export function getCardImage(cardId: string): string | null {
  const url = CARD_IMAGES[cardId];
  if (!url) return null;
  return `/api/card-image?url=${encodeURIComponent(url)}`;
}

export function getCardImageByName(cardName: string): string | null {
  const normalized = cardName.toLowerCase().trim();

  for (const [id] of Object.entries(CARD_IMAGES)) {
    const idNormalized = id.replace(/-/g, " ");
    if (normalized.includes(idNormalized) || idNormalized.includes(normalized)) return getCardImage(id);
  }

  const keywords = normalized.split(/\s+/);
  for (const [id] of Object.entries(CARD_IMAGES)) {
    const idWords = id.split("-");
    const matchCount = keywords.filter(k => idWords.some(w => w.includes(k) || k.includes(w))).length;
    if (matchCount >= 2) return getCardImage(id);
  }

  return null;
}
