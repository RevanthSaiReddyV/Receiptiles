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
  cardBrand?: string;
}

function generateBarcode(id: string): string {
  const bars: string[] = [];
  for (let i = 0; i < 50; i++) {
    const charCode = id.charCodeAt(i % id.length);
    bars.push(((charCode + i) % 3 === 0) ? "wide" : "narrow");
  }
  return bars.join(",");
}

export function ReceiptPaper(props: ReceiptPaperProps) {
  const {
    merchant, location, date, items, subtotal, tax, tip,
    discount, fees, total, paymentMethod, cardLast4, source,
    receiptId, cardBrand,
  } = props;

  const isPOS = source === "POS";
  const d = new Date(date);
  const barcode = generateBarcode(receiptId);
  const transId = receiptId.slice(-8).toUpperCase();

  if (isPOS) {
    return <POSReceipt {...{ merchant, location, d, items, subtotal, tax, tip, discount, fees, total, paymentMethod, cardLast4, cardBrand, receiptId, transId, barcode }} />;
  }

  return <EmailReceipt {...{ merchant, location, d, items, subtotal, tax, tip, discount, fees, total, paymentMethod, cardLast4, source, receiptId, transId, barcode }} />;
}

/* ─────────────────────── POS RECEIPT (Square-style) ──────────────────── */

function POSReceipt({ merchant, location, d, items, subtotal, tax, tip, discount, fees, total, paymentMethod, cardLast4, cardBrand, transId, barcode }: {
  merchant: string; location: string | null; d: Date; items: ReceiptItem[];
  subtotal: number; tax: number; tip: number; discount: number; fees: number;
  total: number; paymentMethod: string; cardLast4: string | null;
  cardBrand?: string; receiptId: string; transId: string; barcode: string;
}) {
  const brand = (cardBrand || paymentMethod || "").toUpperCase();
  const brandDisplay = brand === "AMEX" ? "AMERICAN EXPRESS" : brand;

  return (
    <div className="relative max-w-sm mx-auto">
      {/* Torn top */}
      <TornEdge direction="top" />

      <div className="bg-white px-6 py-5 font-mono text-[12px] leading-[1.6] text-black shadow-xl">
        {/* Store header */}
        <div className="text-center mb-3">
          <div className="text-[15px] font-bold tracking-wide">{merchant.toUpperCase()}</div>
          {location && <div className="text-[10px] text-neutral-600">{location}</div>}
          <div className="text-[10px] text-neutral-600 mt-0.5">
            {d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "numeric" })}
            {"  "}
            {d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
          </div>
          <div className="text-[10px] text-neutral-500">Trans #{transId}</div>
        </div>

        <SolidDivider />

        {/* Card info block — like Square prints */}
        {cardLast4 && (
          <>
            <div className="my-2 text-[11px]">
              <div className="flex justify-between">
                <span>{brandDisplay}</span>
                <span>SALE</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Card #: **** **** **** {cardLast4}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Entry: {paymentMethod === "CARD" ? "CHIP" : "TAP"}</span>
                <span>Approval: {transId.slice(0, 6)}</span>
              </div>
            </div>
            <SolidDivider />
          </>
        )}

        {/* Items */}
        {items.length > 0 ? (
          <div className="my-2">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span className="flex-1 truncate pr-2">
                  {item.qty > 1 ? `${item.qty} x ` : ""}{item.name}
                </span>
                <span className="tabular-nums">{fmt(item.price)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="my-2 text-center text-neutral-400 text-[10px]">
            — Item details not available —
          </div>
        )}

        <DashedDivider />

        {/* Totals block */}
        <div className="my-2 space-y-0.5">
          {subtotal > 0 && subtotal !== total && (
            <TotalRow label="Subtotal" value={fmt(subtotal)} />
          )}
          {discount > 0 && <TotalRow label="Discount" value={`-${fmt(discount)}`} />}
          {tax > 0 && <TotalRow label="Tax" value={fmt(tax)} />}
          {fees > 0 && <TotalRow label="Fees" value={fmt(fees)} />}
        </div>

        <SolidDivider />

        {/* Grand total */}
        <div className="flex justify-between font-bold text-[15px] my-2">
          <span>TOTAL</span>
          <span className="tabular-nums">{fmt(total)}</span>
        </div>

        {tip > 0 && (
          <div className="flex justify-between text-[11px] text-neutral-600">
            <span>Tip</span>
            <span className="tabular-nums">{fmt(tip)}</span>
          </div>
        )}

        {tip > 0 && (
          <>
            <DashedDivider />
            <div className="flex justify-between font-bold text-[13px]">
              <span>TOTAL + TIP</span>
              <span className="tabular-nums">{fmt(total)}</span>
            </div>
          </>
        )}

        {/* Tip and signature line (POS style) */}
        {tip === 0 && (
          <div className="mt-4 space-y-3">
            <div>
              <div className="text-[10px] text-neutral-500">Tip: ________________</div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-500">Total: ________________</div>
            </div>
          </div>
        )}

        <div className="mt-4 mb-2">
          <div className="text-[10px] text-neutral-500">Signature</div>
          <div className="mt-1 border-b border-neutral-300 h-8" />
          <div className="text-[9px] text-neutral-400 mt-0.5">I agree to pay the above total amount</div>
        </div>

        <SolidDivider />

        {/* Barcode */}
        <div className="mt-3 flex justify-center">
          <div className="flex items-end gap-[0.5px] h-12">
            {barcode.split(",").map((bar, i) => (
              <div
                key={i}
                className="bg-black"
                style={{
                  width: bar === "wide" ? "2px" : "0.8px",
                  height: `${32 + ((i * 3) % 16)}px`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="text-center text-[9px] text-neutral-500 mt-1 tracking-[0.15em]">
          {transId}
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-[10px] text-neutral-500">
          <div>CUSTOMER COPY</div>
          <div className="mt-1 font-bold text-[11px] text-black">THANK YOU!</div>
          <div className="mt-0.5 text-[9px] text-neutral-400">Powered by Receipts Platform</div>
        </div>
      </div>

      {/* Torn bottom */}
      <TornEdge direction="bottom" />
    </div>
  );
}

/* ─────────────────────── EMAIL RECEIPT (original style) ──────────────── */

function EmailReceipt({ merchant, location, d, items, subtotal, tax, tip, discount, fees, total, paymentMethod, cardLast4, source, receiptId, transId, barcode }: {
  merchant: string; location: string | null; d: Date; items: ReceiptItem[];
  subtotal: number; tax: number; tip: number; discount: number; fees: number;
  total: number; paymentMethod: string; cardLast4: string | null;
  source: string; receiptId: string; transId: string; barcode: string;
}) {
  return (
    <div className="relative max-w-sm mx-auto">
      <TornEdge direction="top" />

      <div className="bg-[#fafaf8] px-8 py-6 font-mono text-[13px] leading-relaxed text-neutral-800 shadow-xl">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-2xl font-bold tracking-wider mb-1">
            {merchant.charAt(0).toUpperCase()}
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

        <DashedDivider />

        {/* Items */}
        {items.length > 0 ? (
          <div className="my-3 space-y-1">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="flex-1 truncate">
                  {item.qty > 1 && <span className="text-neutral-500">{item.qty}x </span>}
                  {item.name}
                </span>
                <span className="tabular-nums whitespace-nowrap">{fmt(item.price)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="my-3 text-center text-neutral-400 text-xs">
            No itemized details available
          </div>
        )}

        <DashedDivider />

        {/* Totals */}
        <div className="my-3 space-y-1">
          {subtotal > 0 && subtotal !== total && <TotalRow label="SUBTOTAL" value={fmt(subtotal)} />}
          {tax > 0 && <TotalRow label="TAX" value={fmt(tax)} />}
          {tip > 0 && <TotalRow label="TIP" value={fmt(tip)} />}
          {discount > 0 && <TotalRow label="DISCOUNT" value={`-${fmt(discount)}`} />}
          {fees > 0 && <TotalRow label="FEES" value={fmt(fees)} />}
        </div>

        <div className="border-t-2 border-dashed border-neutral-400 my-2" />

        <div className="flex justify-between font-bold text-base my-2">
          <span>TOTAL</span>
          <span className="tabular-nums">{fmt(total)}</span>
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
          {transId}
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-[10px] text-neutral-400">
          <div className="uppercase tracking-wider">
            {source === "EMAIL" ? "Imported from email" : source === "UPLOAD" ? "Uploaded" : source.toLowerCase()}
          </div>
          <div className="mt-1">THANK YOU</div>
        </div>
      </div>

      <TornEdge direction="bottom" />
    </div>
  );
}

/* ─────────────────────── SHARED COMPONENTS ───────────────────────────── */

function TornEdge({ direction }: { direction: "top" | "bottom" }) {
  const path = direction === "top"
    ? "M0 10 Q5 0 10 10 Q15 0 20 10"
    : "M0 0 Q5 10 10 0 Q15 10 20 0";
  const fill = direction === "top" ? "%23ffffff" : "%23ffffff";
  const bgPos = direction === "top" ? "bg-bottom" : "bg-top";

  return (
    <div
      className={`h-3 bg-repeat-x bg-[length:20px_10px] ${bgPos}`}
      style={{
        backgroundImage: `url('data:image/svg+xml,%3Csvg xmlns%3D%22http%3A//www.w3.org/2000/svg%22 viewBox%3D%220 0 20 10%22%3E%3Cpath d%3D%22${path}%22 fill%3D%22${fill}%22/%3E%3C/svg%3E')`,
      }}
    />
  );
}

function SolidDivider() {
  return <div className="border-t border-neutral-300 my-1.5" />;
}

function DashedDivider() {
  return <div className="border-t border-dashed border-neutral-300 my-2" />;
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-neutral-600">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function fmt(n: number): string {
  return `$${n.toFixed(2)}`;
}
