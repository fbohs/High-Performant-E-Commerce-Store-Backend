import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export const Role = {
    USER: "USER",
    MERCHANT: "MERCHANT",
    ADMIN: "ADMIN"
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const OrderStatus = {
    PENDING: "PENDING",
    CONFIRMED: "CONFIRMED",
    PROCESSING: "PROCESSING",
    SHIPPED: "SHIPPED",
    DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED"
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
export type Address = {
    id: Generated<string>;
    publicId: Generated<string>;
    userId: string;
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
export type CartItem = {
    id: Generated<string>;
    userId: string;
    productId: string;
    quantity: Generated<number>;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type Category = {
    id: Generated<string>;
    publicId: Generated<string>;
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type Inventory = {
    id: Generated<string>;
    productId: string;
    quantity: Generated<number>;
    reserved: Generated<number>;
    updatedAt: Generated<Timestamp>;
};
export type Order = {
    id: Generated<string>;
    publicId: Generated<string>;
    userId: string;
    addressId: string | null;
    status: Generated<OrderStatus>;
    subtotal: string;
    tax: Generated<string>;
    shippingCost: Generated<string>;
    total: string;
    promoCode: string | null;
    discount: Generated<string>;
    notes: string | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type OrderItem = {
    id: Generated<string>;
    orderId: string;
    productId: string;
    quantity: number;
    price: string;
    createdAt: Generated<Timestamp>;
};
export type Payment = {
    id: Generated<string>;
    orderId: string;
    provider: string;
    providerRef: string | null;
    status: string;
    amount: string;
    currency: Generated<string>;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type Product = {
    id: Generated<string>;
    publicId: Generated<string>;
    name: string;
    slug: string;
    description: string | null;
    price: string;
    comparePrice: string | null;
    sku: string;
    brand: string | null;
    images: string[];
    categoryId: string;
    merchantId: string;
    isActive: Generated<boolean>;
    avgRating: string | null;
    reviewCount: Generated<number>;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type Review = {
    id: Generated<string>;
    publicId: Generated<string>;
    userId: string;
    productId: string;
    rating: number;
    title: string | null;
    body: string | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type Session = {
    id: Generated<string>;
    token: string;
    userId: string;
    expiresAt: Timestamp;
    createdAt: Generated<Timestamp>;
};
export type User = {
    id: Generated<string>;
    publicId: Generated<string>;
    email: string;
    phone: string | null;
    name: string | null;
    password: string;
    role: Generated<Role>;
    isVerified: Generated<boolean>;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type DB = {
    Address: Address;
    CartItem: CartItem;
    Category: Category;
    Inventory: Inventory;
    Order: Order;
    OrderItem: OrderItem;
    Payment: Payment;
    Product: Product;
    Review: Review;
    Session: Session;
    User: User;
};
