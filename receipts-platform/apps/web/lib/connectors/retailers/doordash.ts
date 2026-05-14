import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const DOORDASH_API = "https://www.doordash.com/graphql";

const ORDERS_QUERY = `
query GetOrderHistory($offset: Int!, $limit: Int!) {
  orderHistory(offset: $offset, limit: $limit) {
    orders {
      id
      orderUuid
      createdAt
      deliveredAt
      storeName
      storeId
      subtotal
      tax
      deliveryFee
      serviceFee
      tip
      total
      discountAmount
      items {
        name
        quantity
        unitPrice
        specialInstructions
        options {
          name
          price
        }
      }
      paymentMethod {
        type
        lastFour
        brand
      }
    }
    hasMore
  }
}
`;

export const doordashConnector: RetailerConnector = {
  id: "doordash",
  name: "DoorDash",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let offset = 0;
    const limit = 20;
    let hasMore = true;

    while (hasMore) {
      console.log(`[DoorDash] Fetching orders offset ${offset}`);

      try {
        const res = await fetch(DOORDASH_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: auth.authToken,
            "x-csrftoken": auth.metadata?.csrfToken ?? "",
            Accept: "application/json",
          },
          body: JSON.stringify({
            query: ORDERS_QUERY,
            variables: { offset, limit },
          }),
        });

        if (!res.ok) break;

        const data = await res.json();
        const history = data?.data?.orderHistory;

        if (!history?.orders?.length) break;

        for (const order of history.orders) {
          const purchasedAt = new Date(order.deliveredAt ?? order.createdAt);
          if (purchasedAt < since) {
            hasMore = false;
            break;
          }
          allOrders.push(normalizeDoorDashOrder(order));
        }

        hasMore = history.hasMore ?? false;
        offset += limit;
      } catch (err) {
        console.error(`[DoorDash] Error:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

function normalizeDoorDashOrder(order: any): RetailerOrder {
  const items: RetailerOrderItem[] = (order.items ?? []).map((item: any) => {
    const optionsTotal = (item.options ?? []).reduce((sum: number, o: any) => sum + (o.price ?? 0), 0);
    return {
      name: item.name,
      quantity: item.quantity || 1,
      unitPrice: (item.unitPrice ?? 0) + optionsTotal,
      totalPrice: ((item.unitPrice ?? 0) + optionsTotal) * (item.quantity || 1),
      category: "Food & Drink",
    };
  });

  return {
    orderId: `doordash-${order.orderUuid ?? order.id}`,
    retailer: "doordash",
    merchantName: order.storeName || "DoorDash",
    purchasedAt: new Date(order.deliveredAt ?? order.createdAt),
    items,
    subtotal: order.subtotal ?? 0,
    tax: order.tax ?? 0,
    total: order.total ?? 0,
    currency: "USD",
    paymentMethod: order.paymentMethod?.brand?.toLowerCase() ?? "card",
    cardLast4: order.paymentMethod?.lastFour,
    rawData: order,
  };
}
