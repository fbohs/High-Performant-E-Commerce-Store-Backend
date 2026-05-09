import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;
export type Numeric = ColumnType<string, number | string, number | string>;

export type Role = "ADMIN" | "MERCHANT" | "USER";
export type OrderStatus =
  | "CANCELLED"
  | "CONFIRMED"
  | "DELIVERED"
  | "PENDING"
  | "PROCESSING"
  | "REFUNDED"
  | "SHIPPED";

export type User = {
  id: Generated<number>;
  email: string;
  phone: string | null;
  name: string | null;
  password: string;
  role: Generated<Role>;
  isVerified: Generated<boolean>;
  createdAt: Generated<Timestamp>;
  updatedAt: Generated<Timestamp>;
};

export type Address = {
  id: Generated<number>;
  userId: number;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isDefault: Generated<boolean>;
  createdAt: Generated<Timestamp>;
  updatedAt: Generated<Timestamp>;
};

export type Category = {
  id: Generated<number>;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Generated<Timestamp>;
};

export type Product = {
  id: Generated<number>;
  name: string;
  slug: string;
  description: string | null;
  price: Numeric;
  comparePrice: Numeric | null;
  sku: string;
  brand: string | null;
  images: string[];
  categoryId: number;
  merchantId: number;
  isActive: Generated<boolean>;
  avgRating: Numeric | null;
  reviewCount: Generated<number>;
  createdAt: Generated<Timestamp>;
  updatedAt: Generated<Timestamp>;
};

export type Inventory = {
  id: Generated<number>;
  productId: number;
  quantity: Generated<number>;
  reserved: Generated<number>;
  updatedAt: Generated<Timestamp>;
};

export type Review = {
  id: Generated<number>;
  userId: number;
  productId: number;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Generated<Timestamp>;
};

export type CartItem = {
  id: Generated<number>;
  userId: number;
  productId: number;
  quantity: Generated<number>;
  createdAt: Generated<Timestamp>;
  updatedAt: Generated<Timestamp>;
};

export type Order = {
  id: Generated<number>;
  userId: number;
  addressId: number | null;
  status: Generated<OrderStatus>;
  subtotal: Numeric;
  tax: Generated<Numeric>;
  shippingCost: Generated<Numeric>;
  total: Numeric;
  promoCode: string | null;
  discount: Generated<Numeric>;
  notes: string | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Generated<Timestamp>;
};

export type OrderItem = {
  id: Generated<number>;
  orderId: number;
  productId: number;
  quantity: number;
  price: Numeric;
  createdAt: Generated<Timestamp>;
};

export type Payment = {
  id: Generated<number>;
  orderId: number;
  provider: string;
  providerRef: string | null;
  status: string;
  amount: Numeric;
  currency: Generated<string>;
  createdAt: Generated<Timestamp>;
  updatedAt: Generated<Timestamp>;
};

export type DB = {
  User: User;
  Address: Address;
  Category: Category;
  Product: Product;
  Inventory: Inventory;
  Review: Review;
  CartItem: CartItem;
  Order: Order;
  OrderItem: OrderItem;
  Payment: Payment;
};
