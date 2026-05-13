"use client";

interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
}

interface ReceiptPaperProps {
  merchant: string;
  merchantRaw: string;
  category: string;
  location: string | null;
  date: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  discount: number;
  fees: number;
  total: number;
  paymentMethod: string;
  cardLast4: string | null;
  source: string;
  confidence: number;
  receiptId: string;
}

const MERCHANT_ICONS: Record<string, string> = {
  amazon: "A",
  apple: "",
  "best buy": "BB",
  costco: "C",
  target: "T",
  walmart: "W",
  uber: "U",
  "uber eats": "UE",
  lyft: "L",
  doordash: "DD",
  instacart: "IC",
  starbucks: "SB",
};

function getMerchantInitial(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(MERCHANT_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return name.charAt(0).toUpperCase();
}

function generateBarcode(id: string): string {
  const bars: string[] = [];
  for (let i = 0; i < 40; i++) {
    const charCode = id.charCodeAt(i % id.length);
    bars.push(((charCode + i) % 3 === 0) ? "wide" : "narrow");
  }
  return bars.join(",");
}

export function ReceiptPaper(props: ReceiptPaperProps) {
  const {
    merchant, location, date, items, subtotal, tax, tip,
    discount, fees, total, paymentMethod, cardLast4, source,
    receiptId,
  } = props;

  const barcode = generateBarcode(receiptId);
  const d = new Date(date);

  return (
    <div className="relative">
      {/* Torn top edge */}
      <div className="h-3 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2020%2010%22%3E%3Cpath%20d%3D%22M0%2010%20Q5%200%2010%2010%20Q15%200%2020%2010%22%20fill%3D%22%23fafaf8%22/%3E%3C/svg%3E')] bg-repeat-x bg-[length:20px_10px] bg-bottom" />

      {/* Receipt body */}
      <div className="bg-[#fafaf8] px-8 py-6 font-mono text-[13px] leading-relaxed text-neutral-800 shadow-lg">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-2xl font-bold tracking-wider mb-1">
            {getMerchantInitial(merchant)}
          </div>
          <div className="text-lg font-bold uppercase tracking-widest">
            {merchant}
          </div>
          {location && (
            <div className="text-xs text-neutral-500 mt-1">{location}</div>
          )}
          <div className="text-xs text-neutral-500 mt-1">
            {d.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
            {" "}
            {d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </div>
        </div>

        <Divider />

        {/* Items */}
        {items.length > 0 ? (
          <div className="my-3 space-y-1">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="flex-1 truncate">
                  {item.qty > 1 && <span className="text-neutral-500">{item.qty}x </span>}
                  {item.name}
                </span>
                <span className="tabular-nums whitespace-nowrap">
                  {formatPrice(item.price)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="my-3 text-center text-neutral-400 text-xs">
            No itemized details available
          </div>
        )}

        <Divider />

        {/* Totals */}
        <div className="my-3 space-y-1">
          {subtotal > 0 && subtotal !== total && (
            <Row label="SUBTOTAL" value={formatPrice(subtotal)} />
          )}
          {tax > 0 && <Row label="TAX" value={formatPrice(tax)} />}
          {tip > 0 && <Row label="TIP" value={formatPrice(tip)} />}
          {discount > 0 && <Row label="DISCOUNT" value={`-${formatPrice(discount)}`} />}
          {fees > 0 && <Row label="FEES" value={formatPrice(fees)} />}
        </div>

        <div className="border-t-2 border-dashed border-neutral-400 my-2" />

        <div className="flex justify-between font-bold text-base my-2">
          <span>TOTAL</span>
          <span className="tabular-nums">{formatPrice(total)}</span>
        </div>

        <div className="border-t-2 border-dashed border-neutral-400 my-2" />

        {/* Payment */}
        <div className="my-3 text-xs text-center text-neutral-500">
          {cardLast4 ? (
            <span>PAID WITH {paymentMethod.toUpperCase()} **** {cardLast4}</span>
          ) : (
            <span>PAID WITH {paymentMethod.toUpperCase()}</span>
          )}
        </div>

        {/* Barcode */}
        <div className="mt-4 flex justify-center">
          <div className="flex items-end gap-[1px] h-10">
            {barcode.split(",").map((bar, i) => (
              <div
                key={i}
                className="bg-neutral-800"
                style={{
                  width: bar === "wide" ? "2.5px" : "1px",
                  height: `${28 + ((i * 3) % 12)}px`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="text-center text-[10px] text-neutral-400 mt-1 tracking-widest">
          {receiptId.toUpperCase().slice(0, 16)}
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-[10px] text-neutral-400">
          <div className="uppercase tracking-wider">
            {source === "EMAIL" ? "Imported from email" : source === "POS" ? "POS capture" : source === "UPLOAD" ? "Uploaded" : source.toLowerCase()}
          </div>
          <div className="mt-1">THANK YOU</div>
        </div>
      </div>

      {/* Torn bottom edge */}
      <div className="h-3 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2020%2010%22%3E%3Cpath%20d%3D%22M0%200%20Q5%2010%2010%200%20Q15%2010%2020%200%22%20fill%3D%22%23fafaf8%22/%3E%3C/svg%3E')] bg-repeat-x bg-[length:20px_10px] bg-top" />
    </div>
  );
}

function Divider() {
  return (
    <div className="border-t border-dashed border-neutral-300 my-2" />
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-neutral-500">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function formatPrice(n: number): string {
  return `$${n.toFixed(2)}`;
}
