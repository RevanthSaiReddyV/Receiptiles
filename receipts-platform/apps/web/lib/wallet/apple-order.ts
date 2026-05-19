import crypto from "crypto";
import { db } from "@receipts/db";

/**
 * Apple Wallet Order Tracking — generates Order objects that appear in Apple
 * Wallet as transaction details with merchant, amount, date, line items,
 * and warranty status.
 *
 * Order packages follow Apple's Order Type format:
 * - order.json — the order data
 * - manifest.json — SHA-256 hashes of all files
 * - signature — PKCS7 detached signature of manifest
 *
 * Environment variables:
 * - APPLE_ORDER_CERTIFICATE (base64 PEM)
 * - APPLE_ORDER_KEY (base64 PEM private key)
 * - APPLE_ORDER_TYPE_ID (order.com.receiptiles.receipts)
 * - APPLE_WWDR_CERTIFICATE (base64 PEM, G4)
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AppleOrderLineItem {
  title: string;
  quantity: number;
  price: { amount: string; currency: string };
  subtitle?: string;
}

export interface AppleOrderPaymentSummaryItem {
  label: string;
  amount: string;
  type: string;
}

export interface AppleOrderReturnPolicy {
  expiresAt: string;
  type: "warranty" | "return";
  description: string;
}

export interface AppleOrder {
  orderTypeIdentifier: string;
  orderIdentifier: string;
  orderManagementURL: string;
  orderType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  merchant: {
    merchantIdentifier: string;
    displayName: string;
    url?: string;
  };
  orderTotal: { amount: string; currency: string };
  payment?: {
    summaryItems: AppleOrderPaymentSummaryItem[];
  };
  lineItems: AppleOrderLineItem[];
  associatedApplications?: Array<{
    applicationIdentifier: string;
    displayName: string;
  }>;
  returnPolicy?: AppleOrderReturnPolicy;
  schemaVersion: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ORDER_TYPE_ID =
  process.env.APPLE_ORDER_TYPE_ID ?? "order.com.receiptiles.receipts";
const TEAM_ID = process.env.APPLE_TEAM_ID ?? "37UQ6CRVCF";
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://receipts-platform.vercel.app";

// ─── Warranty Rules ─────────────────────────────────────────────────────────

interface WarrantyRule {
  durationDays: number;
  type: "warranty" | "return";
  description: string;
}

const WARRANTY_RULES: Record<string, WarrantyRule> = {
  Electronics: {
    durationDays: 365,
    type: "warranty",
    description: "1 year manufacturer warranty",
  },
  Appliances: {
    durationDays: 730,
    type: "warranty",
    description: "2 year manufacturer warranty",
  },
  Clothing: {
    durationDays: 30,
    type: "return",
    description: "30 day return window",
  },
  Fashion: {
    durationDays: 30,
    type: "return",
    description: "30 day return window",
  },
  Shopping: {
    durationDays: 30,
    type: "return",
    description: "30 day return window",
  },
};

const DEFAULT_WARRANTY_RULE: WarrantyRule = {
  durationDays: 30,
  type: "return",
  description: "30 day return window",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Format a number as a 2-decimal-place string (Apple's required format).
 */
function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Generate a deterministic merchant identifier from the canonical name.
 */
function merchantIdentifier(merchantName: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(merchantName.toLowerCase())
    .digest("hex")
    .slice(0, 16);
  return `merchant.${hash}`;
}

/**
 * Calculate warranty/return expiry based on merchant category.
 */
function calculateReturnPolicy(
  category: string,
  purchaseDate: Date
): AppleOrderReturnPolicy {
  const rule = WARRANTY_RULES[category] ?? DEFAULT_WARRANTY_RULE;
  const expiryDate = new Date(purchaseDate);
  expiryDate.setDate(expiryDate.getDate() + rule.durationDays);

  return {
    expiresAt: expiryDate.toISOString(),
    type: rule.type,
    description: rule.description,
  };
}

// ─── Order Generation ───────────────────────────────────────────────────────

/**
 * Generate an Apple Order object from a receipt in the database.
 */
export async function generateOrderFromReceipt(
  receiptId: string
): Promise<AppleOrder> {
  const receipt = await db.receipt.findUnique({
    where: { id: receiptId },
    include: {
      items: {
        select: {
          name: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
        },
      },
    },
  });

  if (!receipt) {
    throw new Error("Receipt not found");
  }

  const now = new Date().toISOString();
  const purchaseDate = receipt.purchasedAt.toISOString();

  // Build payment summary
  const summaryItems: AppleOrderPaymentSummaryItem[] = [];
  if (receipt.subtotal > 0) {
    summaryItems.push({
      label: "Subtotal",
      amount: formatAmount(receipt.subtotal),
      type: "subtotal",
    });
  }
  if (receipt.tax > 0) {
    summaryItems.push({
      label: "Tax",
      amount: formatAmount(receipt.tax),
      type: "tax",
    });
  }
  if (receipt.tip > 0) {
    summaryItems.push({
      label: "Tip",
      amount: formatAmount(receipt.tip),
      type: "tip",
    });
  }
  if (receipt.discount > 0) {
    summaryItems.push({
      label: "Discount",
      amount: `-${formatAmount(receipt.discount)}`,
      type: "discount",
    });
  }
  summaryItems.push({
    label: "Total",
    amount: formatAmount(receipt.total),
    type: "total",
  });

  // Build line items
  const lineItems: AppleOrderLineItem[] = receipt.items.map((item) => ({
    title: item.name,
    quantity: item.quantity,
    price: {
      amount: formatAmount(item.totalPrice),
      currency: receipt.currency,
    },
  }));

  // Calculate return/warranty policy
  const returnPolicy = calculateReturnPolicy(
    receipt.merchantCategory,
    receipt.purchasedAt
  );

  const order: AppleOrder = {
    orderTypeIdentifier: ORDER_TYPE_ID,
    orderIdentifier: `order_${receipt.id}`,
    orderManagementURL: `${BASE_URL}/receipts/${receipt.id}`,
    orderType: "ecommerce",
    status: "completed",
    createdAt: purchaseDate,
    updatedAt: now,
    merchant: {
      merchantIdentifier: merchantIdentifier(receipt.merchantCanonicalName),
      displayName: receipt.merchantCanonicalName,
    },
    orderTotal: {
      amount: formatAmount(receipt.total),
      currency: receipt.currency,
    },
    payment:
      summaryItems.length > 1 ? { summaryItems } : undefined,
    lineItems,
    associatedApplications: [
      {
        applicationIdentifier: "com.receiptiles.app",
        displayName: "Receiptiles",
      },
    ],
    returnPolicy,
    schemaVersion: 1,
  };

  return order;
}

// ─── Order Package Signing ──────────────────────────────────────────────────

/**
 * Sign an order package and return the raw bytes of the signed bundle.
 *
 * The order package is a ZIP containing:
 * - order.json
 * - manifest.json (SHA-256 hashes of all files)
 * - signature (PKCS7 detached signature of manifest.json)
 *
 * Uses Node.js crypto for signing with the Apple Order certificate.
 */
export function signOrderPackage(order: AppleOrder): Buffer {
  const certB64 = process.env.APPLE_ORDER_CERTIFICATE;
  const keyB64 = process.env.APPLE_ORDER_KEY;
  const wwdrB64 = process.env.APPLE_WWDR_CERTIFICATE;

  if (!certB64 || !keyB64 || !wwdrB64) {
    throw new Error(
      "Missing Apple Order signing certificates. Set APPLE_ORDER_CERTIFICATE, APPLE_ORDER_KEY, and APPLE_WWDR_CERTIFICATE."
    );
  }

  const signerCert = Buffer.from(certB64, "base64").toString("utf-8");
  const signerKey = Buffer.from(keyB64, "base64").toString("utf-8");
  const wwdrCert = Buffer.from(wwdrB64, "base64").toString("utf-8");

  // 1. Create order.json
  const orderJson = Buffer.from(JSON.stringify(order, null, 2), "utf-8");

  // 2. Create manifest.json with SHA-256 hash of order.json
  const orderHash = crypto
    .createHash("sha256")
    .update(orderJson)
    .digest("hex");
  const manifest = Buffer.from(
    JSON.stringify({ "order.json": orderHash }, null, 2),
    "utf-8"
  );

  // 3. Sign the manifest with PKCS7 detached signature
  const signature = createDetachedSignature(manifest, signerCert, signerKey, wwdrCert);

  // 4. Build ZIP package manually (minimal ZIP for 3 files)
  const zipBuffer = buildOrderZip({
    "order.json": orderJson,
    "manifest.json": manifest,
    signature: signature,
  });

  return zipBuffer;
}

/**
 * Create a PKCS7 detached signature of the given data using the
 * signer certificate and private key.
 */
function createDetachedSignature(
  data: Buffer,
  certPem: string,
  keyPem: string,
  _wwdrPem: string
): Buffer {
  // Create SHA-256 signature using the private key
  const sign = crypto.createSign("SHA256");
  sign.update(data);
  sign.end();

  const signatureBytes = sign.sign(keyPem);

  // For Apple's order verification, we need a DER-encoded CMS/PKCS7 structure.
  // Build a simplified PKCS#7 SignedData structure containing:
  // - The signer certificate
  // - The signature value
  // - SHA-256 algorithm identifier
  //
  // This uses a minimal ASN.1 DER encoding approach.
  const certDer = pemToDer(certPem);
  const wwdrDer = pemToDer(_wwdrPem);

  return buildPkcs7SignedData(signatureBytes, certDer, wwdrDer, data);
}

/**
 * Convert PEM to DER by stripping headers and base64 decoding.
 */
function pemToDer(pem: string): Buffer {
  const lines = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  return Buffer.from(lines, "base64");
}

/**
 * Build a minimal PKCS#7 SignedData structure (DER-encoded) for Apple order
 * signature verification.
 *
 * Structure:
 *   ContentInfo {
 *     contentType: signedData (1.2.840.113549.1.7.2)
 *     content: SignedData {
 *       version: 1
 *       digestAlgorithms: { sha256 }
 *       encapContentInfo: { data (empty for detached) }
 *       certificates: [signerCert, wwdrCert]
 *       signerInfos: [{
 *         version: 1
 *         issuerAndSerialNumber: ...
 *         digestAlgorithm: sha256
 *         signatureAlgorithm: rsaEncryption
 *         signature: <signatureBytes>
 *       }]
 *     }
 *   }
 */
function buildPkcs7SignedData(
  signatureBytes: Buffer,
  signerCertDer: Buffer,
  wwdrCertDer: Buffer,
  _data: Buffer
): Buffer {
  // OID constants
  const OID_SIGNED_DATA = Buffer.from([
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02,
  ]); // 1.2.840.113549.1.7.2
  const OID_DATA = Buffer.from([
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x01,
  ]); // 1.2.840.113549.1.7.1
  const OID_SHA256 = Buffer.from([
    0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01,
  ]); // 2.16.840.1.101.3.4.2.1
  const OID_RSA = Buffer.from([
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
  ]); // 1.2.840.113549.1.1.1

  // Helper: DER length encoding
  function derLength(len: number): Buffer {
    if (len < 0x80) return Buffer.from([len]);
    if (len < 0x100) return Buffer.from([0x81, len]);
    if (len < 0x10000)
      return Buffer.from([0x82, (len >> 8) & 0xff, len & 0xff]);
    return Buffer.from([
      0x83,
      (len >> 16) & 0xff,
      (len >> 8) & 0xff,
      len & 0xff,
    ]);
  }

  // Helper: wrap content in a TLV
  function tlv(tag: number, content: Buffer): Buffer {
    return Buffer.concat([Buffer.from([tag]), derLength(content.length), content]);
  }

  // Helper: SEQUENCE
  function seq(...items: Buffer[]): Buffer {
    const content = Buffer.concat(items);
    return tlv(0x30, content);
  }

  // Helper: SET
  function set(...items: Buffer[]): Buffer {
    const content = Buffer.concat(items);
    return tlv(0x31, content);
  }

  // Helper: INTEGER
  function integer(value: number): Buffer {
    if (value < 0x80) return tlv(0x02, Buffer.from([value]));
    return tlv(0x02, Buffer.from([0x00, value]));
  }

  // Helper: context-tagged [0] EXPLICIT
  function contextExplicit(tagNum: number, content: Buffer): Buffer {
    const tag = 0xa0 | tagNum;
    return Buffer.concat([
      Buffer.from([tag]),
      derLength(content.length),
      content,
    ]);
  }

  // Helper: context-tagged [0] IMPLICIT (for certificates)
  function contextImplicit(tagNum: number, content: Buffer): Buffer {
    const tag = 0xa0 | tagNum;
    return Buffer.concat([
      Buffer.from([tag]),
      derLength(content.length),
      content,
    ]);
  }

  // DigestAlgorithm: AlgorithmIdentifier for SHA-256
  const digestAlgId = seq(OID_SHA256, Buffer.from([0x05, 0x00])); // NULL params
  const digestAlgorithms = set(digestAlgId);

  // EncapContentInfo (detached — no eContent)
  const encapContentInfo = seq(OID_DATA);

  // Certificates [0] IMPLICIT
  const certsContent = Buffer.concat([signerCertDer, wwdrCertDer]);
  const certificates = contextImplicit(0, certsContent);

  // SignerInfo
  // We use a placeholder for issuerAndSerialNumber by extracting from the cert
  // For simplicity, use the full signer cert's issuer + serial from DER
  const issuerAndSerial = extractIssuerAndSerial(signerCertDer);
  const signatureAlgId = seq(OID_RSA, Buffer.from([0x05, 0x00]));
  const sigValue = tlv(0x04, signatureBytes); // OCTET STRING

  const signerInfo = seq(
    integer(1), // version
    issuerAndSerial,
    digestAlgId,
    signatureAlgId,
    sigValue
  );
  const signerInfos = set(signerInfo);

  // SignedData
  const signedData = seq(
    integer(1), // version
    digestAlgorithms,
    encapContentInfo,
    certificates,
    signerInfos
  );

  // ContentInfo
  const contentInfo = seq(
    OID_SIGNED_DATA,
    contextExplicit(0, signedData)
  );

  return contentInfo;
}

/**
 * Extract issuer and serial number from a DER-encoded X.509 certificate.
 * Returns a SEQUENCE of (issuer, serialNumber) for SignerInfo.
 */
function extractIssuerAndSerial(certDer: Buffer): Buffer {
  // Parse the TBSCertificate to get issuer and serialNumber
  // X.509 structure: SEQUENCE { tbsCertificate, signatureAlgorithm, signatureValue }
  // TBSCertificate: SEQUENCE { version [0], serialNumber, signature, issuer, ... }

  try {
    let offset = 0;

    // Outer SEQUENCE (Certificate)
    offset = skipTag(certDer, offset); // tag 0x30
    offset = skipLength(certDer, offset);

    // TBSCertificate SEQUENCE
    const tbsStart = offset;
    offset = skipTag(certDer, offset); // tag 0x30
    const tbsContentStart = skipLengthGetOffset(certDer, offset);
    offset = tbsContentStart;

    // Version [0] EXPLICIT (optional — v3 certs have this)
    if (certDer[offset] === 0xa0) {
      offset = skipTag(certDer, offset);
      const vLen = readLength(certDer, offset);
      offset = skipLengthGetOffset(certDer, offset) + vLen;
    }

    // SerialNumber INTEGER
    const serialStart = offset;
    offset = skipTag(certDer, offset); // tag 0x02
    const serialLen = readLength(certDer, offset);
    const serialEnd = skipLengthGetOffset(certDer, offset) + serialLen;
    const serialNumber = certDer.subarray(serialStart, serialEnd);
    offset = serialEnd;

    // Signature AlgorithmIdentifier SEQUENCE (skip)
    offset = skipTag(certDer, offset);
    const sigAlgLen = readLength(certDer, offset);
    offset = skipLengthGetOffset(certDer, offset) + sigAlgLen;

    // Issuer Name SEQUENCE
    const issuerStart = offset;
    offset = skipTag(certDer, offset);
    const issuerLen = readLength(certDer, offset);
    const issuerEnd = skipLengthGetOffset(certDer, offset) + issuerLen;
    const issuer = certDer.subarray(issuerStart, issuerEnd);

    // Build IssuerAndSerialNumber SEQUENCE
    const content = Buffer.concat([issuer, serialNumber]);
    const tag = Buffer.from([0x30]);
    const len =
      content.length < 0x80
        ? Buffer.from([content.length])
        : content.length < 0x100
          ? Buffer.from([0x81, content.length])
          : Buffer.from([0x82, (content.length >> 8) & 0xff, content.length & 0xff]);

    return Buffer.concat([tag, len, content]);
  } catch {
    // Fallback: return empty sequence if parsing fails
    return Buffer.from([0x30, 0x00]);
  }
}

// ASN.1 DER parsing helpers
function skipTag(buf: Buffer, offset: number): number {
  return offset + 1;
}

function readLength(buf: Buffer, offset: number): number {
  const first = buf[offset];
  if (first < 0x80) return first;
  const numBytes = first & 0x7f;
  let len = 0;
  for (let i = 0; i < numBytes; i++) {
    len = (len << 8) | buf[offset + 1 + i];
  }
  return len;
}

function skipLength(buf: Buffer, offset: number): number {
  const first = buf[offset];
  if (first < 0x80) return offset + 1;
  const numBytes = first & 0x7f;
  return offset + 1 + numBytes;
}

function skipLengthGetOffset(buf: Buffer, offset: number): number {
  return skipLength(buf, offset);
}

// ─── ZIP Builder ────────────────────────────────────────────────────────────

/**
 * Build a minimal ZIP file from a map of filename -> content.
 * Implements the ZIP format (PKZIP APPNOTE) with STORE compression (no compression).
 */
function buildOrderZip(files: Record<string, Buffer>): Buffer {
  const entries: Array<{
    name: Buffer;
    content: Buffer;
    crc32: number;
    offset: number;
  }> = [];

  const parts: Buffer[] = [];
  let offset = 0;

  // Local file headers + data
  for (const [filename, content] of Object.entries(files)) {
    const nameBuffer = Buffer.from(filename, "utf-8");
    const crc = crc32(content);

    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // local file header signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // general purpose bit flag
    localHeader.writeUInt16LE(0, 8); // compression method: STORE
    localHeader.writeUInt16LE(0, 10); // last mod file time
    localHeader.writeUInt16LE(0, 12); // last mod file date
    localHeader.writeUInt32LE(crc, 14); // crc-32
    localHeader.writeUInt32LE(content.length, 18); // compressed size
    localHeader.writeUInt32LE(content.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26); // file name length
    localHeader.writeUInt16LE(0, 28); // extra field length
    nameBuffer.copy(localHeader, 30);

    entries.push({ name: nameBuffer, content, crc32: crc, offset });
    parts.push(localHeader, content);
    offset += localHeader.length + content.length;
  }

  // Central directory
  const centralStart = offset;
  for (const entry of entries) {
    const centralHeader = Buffer.alloc(46 + entry.name.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // central directory header signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // general purpose bit flag
    centralHeader.writeUInt16LE(0, 10); // compression method: STORE
    centralHeader.writeUInt16LE(0, 12); // last mod file time
    centralHeader.writeUInt16LE(0, 14); // last mod file date
    centralHeader.writeUInt32LE(entry.crc32, 16); // crc-32
    centralHeader.writeUInt32LE(entry.content.length, 20); // compressed size
    centralHeader.writeUInt32LE(entry.content.length, 24); // uncompressed size
    centralHeader.writeUInt16LE(entry.name.length, 28); // file name length
    centralHeader.writeUInt16LE(0, 30); // extra field length
    centralHeader.writeUInt16LE(0, 32); // file comment length
    centralHeader.writeUInt16LE(0, 34); // disk number start
    centralHeader.writeUInt16LE(0, 36); // internal file attributes
    centralHeader.writeUInt32LE(0, 38); // external file attributes
    centralHeader.writeUInt32LE(entry.offset, 42); // relative offset of local header
    entry.name.copy(centralHeader, 46);

    parts.push(centralHeader);
    offset += centralHeader.length;
  }

  const centralEnd = offset;
  const centralSize = centralEnd - centralStart;

  // End of central directory record
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0); // end of central dir signature
  endRecord.writeUInt16LE(0, 4); // number of this disk
  endRecord.writeUInt16LE(0, 6); // disk where central dir starts
  endRecord.writeUInt16LE(entries.length, 8); // number of entries on this disk
  endRecord.writeUInt16LE(entries.length, 10); // total number of entries
  endRecord.writeUInt32LE(centralSize, 12); // size of central directory
  endRecord.writeUInt32LE(centralStart, 16); // offset of start of central directory
  endRecord.writeUInt16LE(0, 20); // comment length

  parts.push(endRecord);

  return Buffer.concat(parts);
}

/**
 * CRC-32 calculation (IEEE 802.3 polynomial).
 */
function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
