/**
 * Card art image URLs from issuer public marketing pages.
 * These are the same images shown on bank websites when advertising their cards.
 */
export const CARD_IMAGES: Record<string, string> = {
  // Chase
  "chase-sapphire-preferred": "https://creditcards.chase.com/K-Marketplace/images/cardart/sapphire_preferred_card.png",
  "chase-sapphire-reserve": "https://creditcards.chase.com/K-Marketplace/images/cardart/sapphire_reserve_card.png",
  "chase-freedom-unlimited": "https://creditcards.chase.com/K-Marketplace/images/cardart/freedom_unlimited_card_alt.png",
  "chase-freedom-flex": "https://creditcards.chase.com/K-Marketplace/images/cardart/freedom_flex_card_alt.png",
  "chase-ink-business-preferred": "https://creditcards.chase.com/K-Marketplace/images/cardart/ink_business_preferred_card.png",
  "chase-ink-business-cash": "https://creditcards.chase.com/K-Marketplace/images/cardart/ink_business_cash_card.png",
  "chase-ink-business-unlimited": "https://creditcards.chase.com/K-Marketplace/images/cardart/ink_business_unlimited_card.png",
  "chase-amazon-prime": "https://m.media-amazon.com/images/G/01/credit/img20/cardart/Cardart_Prime_background._CB636109498_.png",

  // Amex
  "amex-gold": "https://icm.aexp-static.com/Internet/Acquisition/US_en/AppContent/OneSite/category/cardarts/gold-card.png",
  "amex-platinum": "https://icm.aexp-static.com/Internet/Acquisition/US_en/AppContent/OneSite/category/cardarts/platinum-card.png",
  "amex-blue-cash-preferred": "https://icm.aexp-static.com/Internet/Acquisition/US_en/AppContent/OneSite/category/cardarts/blue-cash-preferred.png",
  "amex-blue-cash-everyday": "https://icm.aexp-static.com/Internet/Acquisition/US_en/AppContent/OneSite/category/cardarts/blue-cash-everyday.png",
  "amex-delta-skymiles-gold": "https://icm.aexp-static.com/Internet/Acquisition/US_en/AppContent/OneSite/category/cardarts/delta-skymiles-gold.png",
  "amex-business-gold": "https://icm.aexp-static.com/Internet/Acquisition/US_en/AppContent/OneSite/category/cardarts/business-gold-card.png",
  "amex-hilton-honors": "https://icm.aexp-static.com/Internet/Acquisition/US_en/AppContent/OneSite/category/cardarts/hilton-honors-card.png",
  "amex-marriott-bonvoy": "https://icm.aexp-static.com/Internet/Acquisition/US_en/AppContent/OneSite/category/cardarts/marriott-bonvoy-card.png",

  // Capital One
  "capital-one-venture-x": "https://ecm.capitalone.com/WCM/card/products/venture-x-background-light.png",
  "capital-one-venture": "https://ecm.capitalone.com/WCM/card/products/venture-background-light.png",
  "capital-one-savor-one": "https://ecm.capitalone.com/WCM/card/products/savor-one-background-light.png",
  "capital-one-savor": "https://ecm.capitalone.com/WCM/card/products/savor-background-light.png",
  "capital-one-quicksilver": "https://ecm.capitalone.com/WCM/card/products/quicksilver-background-light.png",

  // Citi
  "citi-double-cash": "https://www.citi.com/CRD/images/citi-double-cash/citi-double-cash-card.png",
  "citi-custom-cash": "https://www.citi.com/CRD/images/citi-custom-cash/citi-custom-cash-card.png",
  "citi-premier": "https://www.citi.com/CRD/images/citi-premier/citi-premier-card.png",
  "citi-strata-premier": "https://www.citi.com/CRD/images/citi-strata-premier/citi-strata-premier-card.png",
  "citi-costco-anywhere": "https://www.citi.com/CRD/images/citi-costco/costco-anywhere-visa-card.png",

  // Discover
  "discover-it-cash-back": "https://www.discover.com/content/dam/discover/en_us/credit-cards/card-acquisitions/grey-702702/images/card-image/discover-it-card-image-light.png",
  "discover-it-miles": "https://www.discover.com/content/dam/discover/en_us/credit-cards/card-acquisitions/grey-702702/images/card-image/discover-it-miles-card-image-light.png",

  // Wells Fargo
  "wells-fargo-active-cash": "https://www.wellsfargo.com/assets/images/photography/702702/wells-fargo-active-cash-visa-signature-card-702702.png",
  "wells-fargo-autograph": "https://www.wellsfargo.com/assets/images/photography/702702/wells-fargo-autograph-visa-signature-card-702702.png",

  // Bank of America
  "boa-customized-cash": "https://www.bankofamerica.com/content/images/ContextualSiteGraphics/702702/en_US/702702_T_CrdArt_CustomizedCash.png",
  "boa-premium-rewards": "https://www.bankofamerica.com/content/images/ContextualSiteGraphics/702702/en_US/702702_T_CrdArt_PremiumRewards.png",
  "boa-unlimited-cash": "https://www.bankofamerica.com/content/images/ContextualSiteGraphics/702702/en_US/702702_T_CrdArt_UnlimitedCash.png",

  // US Bank
  "us-bank-altitude-go": "https://www.usbank.com/dam/images/creditcards/altitude-go-visa-signature-card.png",
  "us-bank-cash-plus": "https://www.usbank.com/dam/images/creditcards/cash-plus-visa-signature-card.png",

  // Other
  "apple-card": "https://www.apple.com/v/apple-card/d/images/overview/titanium_card__f5b1kara2boy_large.png",
  "target-redcard": "https://target.scene7.com/is/image/Target/GUEST_61fa0d24-fdd2-4ff3-9e09-2e25e0c5f7f7",
  "walmart-rewards": "https://i5.walmartimages.com/dfw/4ff9c6c9-750f/k2-_42da5f8c-11fc-4e28-88f5-f94c8dd34199.v1.png",
  "capital-one-walmart": "https://ecm.capitalone.com/WCM/card/products/walmart-rewards-background-light.png",
};

export function getCardImage(cardId: string): string | null {
  return CARD_IMAGES[cardId] ?? null;
}

export function getCardImageByName(cardName: string): string | null {
  const normalized = cardName.toLowerCase().trim();

  // Direct match on card database IDs
  for (const [id, url] of Object.entries(CARD_IMAGES)) {
    if (normalized.includes(id.replace(/-/g, " "))) return url;
  }

  // Fuzzy match
  const keywords = normalized.split(/\s+/);
  for (const [id, url] of Object.entries(CARD_IMAGES)) {
    const idWords = id.split("-");
    const matchCount = keywords.filter(k => idWords.some(w => w.includes(k) || k.includes(w))).length;
    if (matchCount >= 2) return url;
  }

  return null;
}
