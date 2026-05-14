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
    const allOrders: RetailerOrder[] = [];
    const now = new Date();

    // Fetch in 6-month chunks to avoid API limits and get all data
    let chunkStart = new Date(since);

    while (chunkStart < now) {
      const chunkEnd = new Date(chunkStart);
      chunkEnd.setMonth(chunkEnd.getMonth() + 6);
      if (chunkEnd > now) chunkEnd.setTime(now.getTime());

      const startDate = chunkStart.toISOString().split("T")[0];
      const endDate = chunkEnd.toISOString().split("T")[0];

      console.log(`[Costco] Fetching ${startDate} to ${endDate}`);

      try {
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
          console.error(`[Costco] API error for ${startDate}-${endDate}: ${res.status} ${errText}`);
          // Don't throw — continue to next chunk
          chunkStart = new Date(chunkEnd);
          continue;
        }

        const data = await res.json();

        if (data.errors) {
          console.error(`[Costco] GraphQL errors:`, data.errors);
          chunkStart = new Date(chunkEnd);
          continue;
        }

        const receipts = data?.data?.warehouseReceipts ?? [];
        console.log(`[Costco] Got ${receipts.length} receipts for ${startDate} to ${endDate}`);

        for (const receipt of receipts) {
          allOrders.push(normalizeCostcoReceipt(receipt));
        }
      } catch (err) {
        console.error(`[Costco] Fetch error for ${startDate}-${endDate}:`, err);
      }

      chunkStart = new Date(chunkEnd);
    }

    return allOrders;
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
  const items: RetailerOrderItem[] = (receipt.itemArray ?? []).map(item => ({
    name: item.itemDescription,
    sku: item.itemNumber,
    quantity: item.unit || 1,
    unitPrice: item.amount / (item.unit || 1),
    totalPrice: item.amount,
    category: "Groceries",
  }));

  const totalTax = (receipt.taxes ?? []).reduce((sum, t) => sum + t.taxAmount, 0);
  const discount = (receipt.couponArray ?? []).reduce((sum, c) => sum + Math.abs(c.couponAmount), 0);

  const tender = receipt.tenderArray?.[0];
  let cardLast4: string | undefined;
  if (tender?.approvalNumber && tender.approvalNumber.length >= 4) {
    cardLast4 = tender.approvalNumber.slice(-4);
  }

  return {
    orderId: `costco-${receipt.transactionDateTime}-${receipt.total}`,
    retailer: "costco",
    merchantName: receipt.warehouseName || "Costco",
    purchasedAt: new Date(receipt.transactionDateTime),
    items,
    subtotal: receipt.subTotal ?? receipt.total - totalTax,
    tax: totalTax,
    total: receipt.total,
    currency: "USD",
    paymentMethod: tender?.tenderTypeCode?.toLowerCase() ?? "card",
    cardLast4,
    rawData: receipt,
  };
}
