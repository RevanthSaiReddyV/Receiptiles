import type { EmailParser, ParsedEmailReceipt } from "./types";
import { amazonParser } from "./amazon";
import { walmartParser } from "./walmart";
import { uberParser } from "./uber";
import { doordashParser } from "./doordash";
import { instacartParser } from "./instacart";
import { genericParser } from "./generic";

export type { EmailParser, ParsedEmailReceipt } from "./types";

const parsers: EmailParser[] = [
  amazonParser,
  walmartParser,
  uberParser,
  doordashParser,
  instacartParser,
  // generic is the last resort — catches anything with a total
  genericParser,
];

export function parseReceiptEmail(
  senderEmail: string,
  subject: string,
  html: string,
  plainText: string
): { result: ParsedEmailReceipt | null; parser: string; needsAI: boolean } {
  for (const parser of parsers) {
    if (parser.id === "generic") continue;
    if (parser.canParse(senderEmail, subject)) {
      const result = parser.parse(html, plainText, subject);
      if (result && result.purchase.total > 0) {
        return { result, parser: parser.id, needsAI: false };
      }
    }
  }

  // Try generic parser
  const genericResult = genericParser.parse(html, plainText, subject);
  if (genericResult && genericResult.purchase.total > 0) {
    // Low confidence from generic → flag for AI fallback if desired
    const needsAI = genericResult.metadata.confidence < 0.5 || genericResult.items.length === 0;
    return { result: genericResult, parser: "generic", needsAI };
  }

  return { result: null, parser: "none", needsAI: true };
}
