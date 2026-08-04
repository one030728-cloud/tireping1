export type SellerListingStatus =
  | "DRAFT"
  | "PENDING"
  | "ACTIVE"
  | "REJECTED"
  | "SOLDOUT"
  | "HIDDEN";

export interface SellerListingView {
  id: string;
  status: SellerListingStatus;
  rejectedReason: string | null;
  manufacturer: string;
  model: string;
  width: number;
  ratio: number;
  rim: number;
  dot: string;
  loadIndex: string;
  speedIndex: string;
  ply: string;
  oe: string | null;
  season: string;
  productCode: string;
  discountRate: number;
  price: number;
  factoryPrice: number;
  stock: number;
  minOrder: number;
  tag: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  seller: {
    id: string;
    code: string;
    courier: string;
    shippingNote: string | null;
    location: string | null;
    intro: string | null;
  };
  images: { id: string; url: string; sortOrder: number }[];
}

export type SellerShippingStatus =
  | "PREPARING"
  | "TRACKING_REGISTERED"
  | "SHIPPED"
  | "DELIVERED";

export interface SellerOrderView {
  id: string;
  listingId: string;
  sellerId: string;
  status: string;
  shippingStatus: SellerShippingStatus;
  courier: string | null;
  trackingNumber: string | null;
  quantity: number;
  unitPrice: number;
  extraShipping: number;
  total: number;
  orderedAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  product: {
    manufacturer: string;
    model: string;
    width: number;
    ratio: number;
    rim: number;
    dot: string;
    sellerCode: string;
  };
  buyer: {
    businessName: string;
    ownerName: string;
    mobilePhone: string;
    officePhone: string | null;
    postalCode: string | null;
    address: string | null;
  };
}
