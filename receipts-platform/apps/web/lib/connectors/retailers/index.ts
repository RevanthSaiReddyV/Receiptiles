import type { RetailerConnector } from "./types";
export type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

import { amazonConnector } from "./amazon";
import { walmartConnector } from "./walmart";
import { targetConnector } from "./target";
import { costcoConnector } from "./costco";
import { krogerConnector } from "./kroger";
import { homeDepotConnector } from "./home-depot";
import { instacartConnector } from "./instacart";
import { doordashConnector } from "./doordash";
import { uberEatsConnector } from "./uber-eats";
import { uberConnector } from "./uber";
import { lyftConnector } from "./lyft";
import { starbucksConnector } from "./starbucks";
import { chipotleConnector } from "./chipotle";
import { chickFilAConnector } from "./chick-fil-a";
import { cvsConnector } from "./cvs";
import { walgreensConnector } from "./walgreens";
import { lowesConnector } from "./lowes";
import { wholeFoodsConnector } from "./whole-foods";
import { safewayConnector } from "./safeway";
import { publixConnector } from "./publix";
import { traderJoesConnector } from "./trader-joes";
import { grubhubConnector } from "./grubhub";
import { bestBuyConnector } from "./best-buy";
import { appleConnector } from "./apple";
import { samsClubConnector } from "./sams-club";

// Central registry of all retailer connectors
export const RETAILER_CONNECTORS: Record<string, RetailerConnector> = {
  amazon: amazonConnector,
  walmart: walmartConnector,
  target: targetConnector,
  costco: costcoConnector,
  kroger: krogerConnector,
  "home-depot": homeDepotConnector,
  instacart: instacartConnector,
  doordash: doordashConnector,
  "uber-eats": uberEatsConnector,
  uber: uberConnector,
  lyft: lyftConnector,
  starbucks: starbucksConnector,
  chipotle: chipotleConnector,
  "chick-fil-a": chickFilAConnector,
  cvs: cvsConnector,
  walgreens: walgreensConnector,
  lowes: lowesConnector,
  "whole-foods": wholeFoodsConnector,
  safeway: safewayConnector,
  publix: publixConnector,
  "trader-joes": traderJoesConnector,
  grubhub: grubhubConnector,
  "best-buy": bestBuyConnector,
  apple: appleConnector,
  "sams-club": samsClubConnector,
};

// Retailer metadata for UI display
export interface RetailerInfo {
  id: string;
  name: string;
  category: RetailerCategory;
  icon: string;
  color: string;
  authMethod: "oauth" | "credentials" | "session" | "email" | "upload";
  description: string;
  dataTypes: string[];
  popular: boolean;
}

export type RetailerCategory =
  | "grocery"
  | "general"
  | "food-delivery"
  | "rideshare"
  | "pharmacy"
  | "home-improvement"
  | "electronics"
  | "wholesale"
  | "coffee"
  | "digital"
  | "fast-food";

export const RETAILER_CATALOG: RetailerInfo[] = [
  {
    id: "amazon",
    name: "Amazon",
    category: "general",
    icon: "📦",
    color: "#FF9900",
    authMethod: "session",
    description: "All Amazon.com orders including Subscribe & Save",
    dataTypes: ["orders", "items", "prices", "shipping", "returns"],
    popular: true,
  },
  {
    id: "walmart",
    name: "Walmart",
    category: "general",
    icon: "🏪",
    color: "#0071DC",
    authMethod: "session",
    description: "In-store and online orders, Walmart+",
    dataTypes: ["orders", "items", "prices", "store-location"],
    popular: true,
  },
  {
    id: "target",
    name: "Target",
    category: "general",
    icon: "🎯",
    color: "#CC0000",
    authMethod: "session",
    description: "Target Circle purchases, in-store and online",
    dataTypes: ["orders", "items", "prices", "store-location", "circle-earnings"],
    popular: true,
  },
  {
    id: "costco",
    name: "Costco",
    category: "wholesale",
    icon: "🏬",
    color: "#E31837",
    authMethod: "session",
    description: "Warehouse receipts and online orders",
    dataTypes: ["orders", "items", "prices", "membership", "coupons"],
    popular: true,
  },
  {
    id: "sams-club",
    name: "Sam's Club",
    category: "wholesale",
    icon: "🏬",
    color: "#0060A9",
    authMethod: "session",
    description: "Club purchases and Scan & Go receipts",
    dataTypes: ["orders", "items", "prices", "membership"],
    popular: true,
  },
  {
    id: "kroger",
    name: "Kroger",
    category: "grocery",
    icon: "🛒",
    color: "#0054A6",
    authMethod: "oauth",
    description: "Kroger, Ralphs, Fred Meyer, QFC and all Kroger brands",
    dataTypes: ["orders", "items", "prices", "fuel-points", "coupons"],
    popular: true,
  },
  {
    id: "whole-foods",
    name: "Whole Foods",
    category: "grocery",
    icon: "🥑",
    color: "#00674B",
    authMethod: "session",
    description: "Whole Foods Market (via Amazon account)",
    dataTypes: ["orders", "items", "prices"],
    popular: true,
  },
  {
    id: "safeway",
    name: "Safeway / Albertsons",
    category: "grocery",
    icon: "🛒",
    color: "#E8362A",
    authMethod: "session",
    description: "Safeway, Albertsons, Vons, Jewel-Osco, Shaw's",
    dataTypes: ["orders", "items", "prices", "just-for-u"],
    popular: false,
  },
  {
    id: "publix",
    name: "Publix",
    category: "grocery",
    icon: "🛒",
    color: "#3E8739",
    authMethod: "session",
    description: "Publix in-store and delivery receipts",
    dataTypes: ["orders", "items", "prices"],
    popular: false,
  },
  {
    id: "trader-joes",
    name: "Trader Joe's",
    category: "grocery",
    icon: "🌺",
    color: "#B40E21",
    authMethod: "upload",
    description: "Receipt scan/photo upload (no digital API available)",
    dataTypes: ["items", "prices"],
    popular: true,
  },
  {
    id: "instacart",
    name: "Instacart",
    category: "grocery",
    icon: "🥕",
    color: "#43B02A",
    authMethod: "session",
    description: "All Instacart deliveries across all stores",
    dataTypes: ["orders", "items", "prices", "replacements", "tips"],
    popular: true,
  },
  {
    id: "doordash",
    name: "DoorDash",
    category: "food-delivery",
    icon: "🍔",
    color: "#FF3008",
    authMethod: "session",
    description: "Restaurant delivery and DashPass orders",
    dataTypes: ["orders", "items", "prices", "tips", "fees"],
    popular: true,
  },
  {
    id: "uber-eats",
    name: "Uber Eats",
    category: "food-delivery",
    icon: "🍕",
    color: "#06C167",
    authMethod: "session",
    description: "All Uber Eats food delivery orders",
    dataTypes: ["orders", "items", "prices", "tips", "fees"],
    popular: true,
  },
  {
    id: "grubhub",
    name: "Grubhub",
    category: "food-delivery",
    icon: "🥡",
    color: "#F63440",
    authMethod: "session",
    description: "Grubhub and Seamless delivery orders",
    dataTypes: ["orders", "items", "prices", "tips"],
    popular: false,
  },
  {
    id: "uber",
    name: "Uber (Rides)",
    category: "rideshare",
    icon: "🚗",
    color: "#000000",
    authMethod: "session",
    description: "Uber ride receipts and trip history",
    dataTypes: ["trips", "fares", "routes", "surge-pricing"],
    popular: true,
  },
  {
    id: "lyft",
    name: "Lyft",
    category: "rideshare",
    icon: "🚙",
    color: "#FF00BF",
    authMethod: "session",
    description: "Lyft ride receipts and trip history",
    dataTypes: ["trips", "fares", "routes"],
    popular: true,
  },
  {
    id: "starbucks",
    name: "Starbucks",
    category: "coffee",
    icon: "☕",
    color: "#00704A",
    authMethod: "session",
    description: "Starbucks app orders and in-store purchases",
    dataTypes: ["orders", "items", "prices", "rewards-stars"],
    popular: true,
  },
  {
    id: "chipotle",
    name: "Chipotle",
    category: "fast-food",
    icon: "🌯",
    color: "#441500",
    authMethod: "session",
    description: "Chipotle orders and rewards history",
    dataTypes: ["orders", "items", "prices", "rewards"],
    popular: false,
  },
  {
    id: "chick-fil-a",
    name: "Chick-fil-A",
    category: "fast-food",
    icon: "🐔",
    color: "#DD0031",
    authMethod: "session",
    description: "Chick-fil-A app orders and rewards",
    dataTypes: ["orders", "items", "prices", "rewards"],
    popular: false,
  },
  {
    id: "home-depot",
    name: "Home Depot",
    category: "home-improvement",
    icon: "🔨",
    color: "#F96302",
    authMethod: "session",
    description: "Home Depot purchases (Pro & consumer)",
    dataTypes: ["orders", "items", "prices", "pro-xtra"],
    popular: true,
  },
  {
    id: "lowes",
    name: "Lowe's",
    category: "home-improvement",
    icon: "🪛",
    color: "#004990",
    authMethod: "session",
    description: "Lowe's in-store and online purchases",
    dataTypes: ["orders", "items", "prices", "mylowes"],
    popular: false,
  },
  {
    id: "best-buy",
    name: "Best Buy",
    category: "electronics",
    icon: "🖥️",
    color: "#0046BE",
    authMethod: "session",
    description: "Best Buy purchases and Totaltech benefits",
    dataTypes: ["orders", "items", "prices", "rewards-points"],
    popular: true,
  },
  {
    id: "apple",
    name: "Apple",
    category: "digital",
    icon: "🍎",
    color: "#000000",
    authMethod: "session",
    description: "App Store, Apple Music, iCloud, and hardware purchases",
    dataTypes: ["purchases", "subscriptions", "apps"],
    popular: true,
  },
  {
    id: "cvs",
    name: "CVS Pharmacy",
    category: "pharmacy",
    icon: "💊",
    color: "#CC0000",
    authMethod: "session",
    description: "CVS purchases and ExtraCare rewards",
    dataTypes: ["orders", "items", "prices", "extracare-bucks"],
    popular: false,
  },
  {
    id: "walgreens",
    name: "Walgreens",
    category: "pharmacy",
    icon: "💊",
    color: "#F1483E",
    authMethod: "session",
    description: "Walgreens purchases and myWalgreens rewards",
    dataTypes: ["orders", "items", "prices", "walgreens-cash"],
    popular: false,
  },
];

// Helper to get connector by ID
export function getConnector(retailerId: string): RetailerConnector | undefined {
  return RETAILER_CONNECTORS[retailerId];
}

// Helper to get retailer info by ID
export function getRetailerInfo(retailerId: string): RetailerInfo | undefined {
  return RETAILER_CATALOG.find((r) => r.id === retailerId);
}

// Get popular retailers (for featured section)
export function getPopularRetailers(): RetailerInfo[] {
  return RETAILER_CATALOG.filter((r) => r.popular);
}

// Get retailers by category
export function getRetailersByCategory(category: RetailerCategory): RetailerInfo[] {
  return RETAILER_CATALOG.filter((r) => r.category === category);
}

// All supported retailer IDs
export function getSupportedRetailerIds(): string[] {
  return Object.keys(RETAILER_CONNECTORS);
}
