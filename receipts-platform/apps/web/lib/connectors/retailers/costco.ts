import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const COSTCO_GRAPHQL_URL = "https://ecom-api.costco.com/ebusiness/order/v1/orders/graphql";
const CLIENT_IDENTIFIER = "481b1aec-aa3b-454b-b81b-48187e28f205";

const ORDERS_QUERY = `
query GetWarehouseReceipts($startDate: String!, $endDate: String!) {
  warehouseReceipts(startDate: $startDate, endDate: $endDate) {
    warehouseName
    transactionDateTime
    total
    subTotal
    totalItemCount
    taxes {
      taxDescription
      taxAmount
      taxPercent
    }
    itemArray {
      itemNumber
      itemDescription
      unit
      amount
      taxFlag
    }
    tenderArray {
      tenderTypeCode
      amountTender
      approvalNumber
    }
    couponArray {
      couponNumber
      couponDescription
      couponAmount
    }
    membershipNumber
  }
}
`;

export const costcoConnector: RetailerConnector = {
  id: "costco",
  name: "Costco",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const startDate = since.toISOString().split("T")[0];
    const endDate = new Date().toISOString().split("T")[0];

    const res = await fetch(COSTCO_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Costco-X-Authorization": `Bearer ${auth.authToken}`,
        "Costco-X-Wcs-Clientid": auth.clientId ?? "",
        "Client-Identifier": CLIENT_IDENTIFIER,
      },
      body: JSON.stringify({
        query: ORDERS_QUERY,
        variables: { startDate, endDate },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Costco API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const receipts = data?.data?.warehouseReceipts ?? [];

    return receipts.map((receipt: CostcoReceipt) => normalizeCostcoReceipt(receipt));
  },
};

interface CostcoReceipt {
  warehouseName: string;
  transactionDateTime: string;
  total: number;
  subTotal: number;
  totalItemCount: number;
  taxes: Array<{ taxDescription: string; taxAmount: number; taxPercent: number }>;
  itemArray: Array<{ itemNumber: string; itemDescription: string; unit: number; amount: number; taxFlag: string }>;
  tenderArray: Array<{ tenderTypeCode: string; amountTender: number; approvalNumber: string }>;
  couponArray: Array<{ couponNumber: string; couponDescription: string; couponAmount: number }>;
  membershipNumber: string;
}

function normalizeCostcoReceipt(receipt: CostcoReceipt): RetailerOrder {
  const items: RetailerOrderItem[] = receipt.itemArray.map(item => ({
    name: item.itemDescription,
    sku: item.itemNumber,
    quantity: item.unit || 1,
    unitPrice: item.amount / (item.unit || 1),
    totalPrice: item.amount,
    category: "Groceries",
  }));

  const totalTax = receipt.taxes.reduce((sum, t) => sum + t.taxAmount, 0);
  const discount = receipt.couponArray.reduce((sum, c) => sum + Math.abs(c.couponAmount), 0);

  const tender = receipt.tenderArray[0];
  let cardLast4: string | undefined;
  if (tender?.tenderTypeCode === "VISA" || tender?.tenderTypeCode === "MC" || tender?.tenderTypeCode === "AMEX") {
    cardLast4 = tender.approvalNumber?.slice(-4);
  }

  return {
    orderId: `costco-${receipt.transactionDateTime}-${receipt.total}`,
    retailer: "costco",
    merchantName: receipt.warehouseName || "Costco",
    purchasedAt: new Date(receipt.transactionDateTime),
    items,
    subtotal: receipt.subTotal,
    tax: totalTax,
    total: receipt.total,
    currency: "USD",
    paymentMethod: tender?.tenderTypeCode?.toLowerCase() ?? "card",
    cardLast4,
    rawData: receipt,
  };
}
