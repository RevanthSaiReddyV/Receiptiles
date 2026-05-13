interface CardBenefit {
  cardName: string;
  cardId: string;
  perks: Array<{
    name: string;
    annualValue: number | null;
    resetDate: string;
  }>;
}

function extractDollarAmount(perk: string): number | null {
  const match = perk.match(/\$(\d[\d,]*)/);
  if (!match) return null;
  return parseFloat(match[1].replace(/,/g, ""));
}

export function parseCardBenefits(
  cards: Array<{
    id: string;
    name: string;
    dbPerks: string[];
  }>
): CardBenefit[] {
  const now = new Date();
  const defaultResetDate = new Date(now.getFullYear(), 11, 31).toISOString();

  return cards
    .filter(card => card.dbPerks.length > 0)
    .map(card => ({
      cardName: card.name,
      cardId: card.id,
      perks: card.dbPerks.map(perkStr => ({
        name: perkStr,
        annualValue: extractDollarAmount(perkStr),
        resetDate: defaultResetDate,
      })),
    }));
}
