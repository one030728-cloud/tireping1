export type Manufacturer =
  "금호" | "한국" | "넥센" | "미쉐린" | "피렐리" | "콘티넨탈" | "브리지스톤" | "굿이어" | "던롭";

export interface Tire {
  id: string;
  manufacturer: Manufacturer;
  model: string;
  width: number;
  ratio: number;
  rim: number;
  dot: string;
  discountRate: number;
  price: number;
  tag: "EVENT" | "BEST" | null;
  stock: number;
}

export interface EventItem {
  id: string;
  title: string;
  bannerGradient: string;
  status: "ongoing" | "ended";
  period: string;
  description: string;
}

export interface Order {
  id: string;
  tireModel: string;
  status: "배송조회" | "입금후취소" | "배송준비" | "배송완료";
  orderedAt: string;
  price: number;
}

export interface Notice {
  id: string;
  title: string;
  date: string;
}

export interface User {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
}

export interface Seller {
  code: string;
  discountRate: number;
  price: number;
  stock: number;
  minOrder: number;
  shippingNote: string;
  courier: string;
}

export interface TireSpec {
  loadIndex: string;
  speedIndex: string;
  ply: string;
  origin: string;
  season: string;
  productCode: string;
}

export interface FactoryTireGroup {
  id: string;
  manufacturer: Manufacturer;
  model: string;
  width: number;
  ratio: number;
  rim: number;
  spec: string;
  factoryPrice: number;
  rows: {
    dot: string;
    discountRate: number;
    price: number;
    stock: number;
  }[];
}

export interface CartItem {
  id: string;
  tireId: string;
  manufacturer: Manufacturer;
  model: string;
  width: number;
  ratio: number;
  rim: number;
  dot: string;
  price: number;
  quantity: number;
  extraShipping: number;
  sellerCode: string;
}

export interface FullOrder {
  id: string;
  status: string;
  manufacturer: Manufacturer;
  model: string;
  width: number;
  ratio: number;
  rim: number;
  factoryPrice: number;
  unitPrice: number;
  quantity: number;
  extraShipping: number;
  total: number;
  sellerCode: string;
  orderedAt: string;
}

export interface DepositRecord {
  orderId: string;
  itemLabel: string;
  paidAmount: number | null;
  refundAmount: number | null;
  date: string;
}

export interface TaxRecord {
  month: string;
  supplyAmount: number;
  vat: number;
  total: number;
}

export interface WishSeller {
  id: string;
  type: string;
  code: string;
  location: string;
  intro: string;
  wishedAt: string;
}

export interface OrderStatusCounts {
  입금대기: number;
  입금완료: number;
  주문확인: number;
  배송준비중: number;
  배송중: number;
  배송완료: number;
  구매확정: number;
}

export interface CancelStatusCounts {
  입금전취소: number;
  입금후취소: number;
  교환완료: number;
  반품완료: number;
  재고없음: number;
  상품미도착: number;
}
