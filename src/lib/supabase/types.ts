import type { Department } from "@/lib/department";

export type Series = {
  id: string;
  department: Department;
  name: string;
  slug: string;
  design_story: string | null;
  hero_image_url: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
};

export type SeriesImage = {
  id: string;
  series_id: string;
  storage_path: string;
  display_order: number;
  created_at: string;
};

export type SeriesWithImages = Series & { images: SeriesImage[] };

export type Category = {
  id: string;
  department: Department;
  name: string;
  slug: string;
  display_order: number;
  created_at: string;
};

export type CategoryImage = {
  id: string;
  category_id: string;
  storage_path: string;
  display_order: number;
  created_at: string;
};

export type CategoryWithImages = Category & { images: CategoryImage[] };

export type ProductSpecs = Record<string, string>;

export type StockStatus = "in_stock" | "made_to_order" | "out_of_stock" | "discontinued";

export type Product = {
  id: string;
  department: Department;
  series_id: string | null;
  category_id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number | null;
  currency: string;
  description: string | null;
  specs: ProductSpecs;
  is_featured: boolean;
  is_published: boolean;
  display_order: number;
  meta_title: string | null;
  meta_description: string | null;
  stock_status: StockStatus;
  created_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  variant_id: string | null;
  storage_path: string;
  alt_text: string | null;
  display_order: number;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  color_name: string;
  color_hex: string | null;
  sku: string | null;
  price: number | null;
  stock_status: StockStatus | null;
  display_order: number;
  created_at: string;
};

export type ProductVariantWithImages = ProductVariant & {
  product_images: ProductImage[];
};

export type ProductResource = {
  id: string;
  product_id: string;
  name: string;
  storage_path: string;
  file_name: string | null;
  display_order: number;
  created_at: string;
};

export type ProductWithRelations = Product & {
  series: Series | null;
  category: Category;
  product_images: ProductImage[];
  variants: ProductVariantWithImages[];
  resources: ProductResource[];
};

export type Finish = {
  id: string;
  name: string;
  code: string;
  hex: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
};

// The deal pipeline a lead moves through. "closed" from before this pipeline
// existed is migrated to "lost" (see 0026_crm.sql) — never written going forward.
export type InquiryStatus = "new" | "contacted" | "quoted" | "won" | "lost";

export type InquiryItem = {
  product_id: string;
  variant_id: string | null;
  quantity: number;
};

export type Inquiry = {
  id: string;
  department: Department;
  product_ids: string[] | null;
  items: InquiryItem[] | null;
  customer_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: InquiryStatus;
  created_at: string;
  deleted_at: string | null;
};

export type Customer = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  department: Department | null;
  created_at: string;
  updated_at: string;
};

export type CustomerNote = {
  id: string;
  customer_id: string;
  body: string;
  created_at: string;
};

export type QuoteLineItem = {
  name: string;
  variantLabel: string | null;
  sku: string | null;
  seriesName: string | null;
  quantity: number;
  unitPrice: number | null;
};

export type Quote = {
  id: string;
  quote_number: string;
  inquiry_id: string | null;
  customer_id: string;
  items: QuoteLineItem[];
  notes: string | null;
  total: number | null;
  sent_at: string;
};

export type OrderStatus = "confirmed" | "in_production" | "shipped" | "delivered" | "cancelled";

export type Order = {
  id: string;
  order_number: string;
  customer_id: string;
  quote_id: string | null;
  inquiry_id: string | null;
  department: Department;
  items: QuoteLineItem[];
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ModerationStatus = "pending" | "approved" | "rejected";

export type Review = {
  id: string;
  product_id: string;
  reviewer_name: string;
  reviewer_email: string;
  rating: number;
  body: string;
  status: ModerationStatus;
  created_at: string;
};

export type ProjectPhoto = {
  id: string;
  department: Department;
  series_id: string | null;
  storage_path: string;
  caption: string | null;
  submitter_name: string;
  submitter_email: string;
  status: ModerationStatus;
  display_order: number;
  created_at: string;
};

export type NewsletterSubscriber = {
  id: string;
  email: string;
  department: Department | null;
  created_at: string;
};

export type ActivityAction = "create" | "update" | "delete";
export type ActivityEntityType =
  | "product"
  | "series"
  | "category"
  | "inquiry"
  | "review"
  | "project_photo"
  | "finish"
  | "customer"
  | "customer_note"
  | "quote"
  | "order";

export type ActivityLogEntry = {
  id: string;
  actor_email: string | null;
  action: ActivityAction;
  entity_type: ActivityEntityType;
  entity_id: string | null;
  entity_name: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      series: {
        Row: Series;
        Insert: Partial<Series> & { name: string; slug: string; department: Department };
        Update: Partial<Series>;
        Relationships: [];
      };
      series_images: {
        Row: SeriesImage;
        Insert: Partial<SeriesImage> & { series_id: string; storage_path: string };
        Update: Partial<SeriesImage>;
        Relationships: [
          {
            foreignKeyName: "series_images_series_id_fkey";
            columns: ["series_id"];
            isOneToOne: false;
            referencedRelation: "series";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: Category;
        Insert: Partial<Category> & { name: string; slug: string; department: Department };
        Update: Partial<Category>;
        Relationships: [];
      };
      category_images: {
        Row: CategoryImage;
        Insert: Partial<CategoryImage> & { category_id: string; storage_path: string };
        Update: Partial<CategoryImage>;
        Relationships: [
          {
            foreignKeyName: "category_images_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: Product;
        Insert: Partial<Product> & {
          name: string;
          slug: string;
          category_id: string;
          department: Department;
        };
        Update: Partial<Product>;
        Relationships: [
          {
            foreignKeyName: "products_series_id_fkey";
            columns: ["series_id"];
            isOneToOne: false;
            referencedRelation: "series";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: ProductImage;
        Insert: Partial<ProductImage> & { product_id: string; storage_path: string };
        Update: Partial<ProductImage>;
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_images_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: ProductVariant;
        Insert: Partial<ProductVariant> & { product_id: string; color_name: string };
        Update: Partial<ProductVariant>;
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_resources: {
        Row: ProductResource;
        Insert: Partial<ProductResource> & { product_id: string; name: string; storage_path: string };
        Update: Partial<ProductResource>;
        Relationships: [
          {
            foreignKeyName: "product_resources_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      newsletter_subscribers: {
        Row: NewsletterSubscriber;
        Insert: Partial<NewsletterSubscriber> & { email: string };
        Update: Partial<NewsletterSubscriber>;
        Relationships: [];
      };
      activity_log: {
        Row: ActivityLogEntry;
        Insert: Partial<ActivityLogEntry> & {
          action: ActivityAction;
          entity_type: ActivityEntityType;
        };
        Update: Partial<ActivityLogEntry>;
        Relationships: [];
      };
      finishes: {
        Row: Finish;
        Insert: Partial<Finish> & { name: string; code: string; hex: string };
        Update: Partial<Finish>;
        Relationships: [];
      };
      inquiries: {
        Row: Inquiry;
        Insert: Partial<Inquiry> & { department: Department; name: string; email: string; message: string };
        Update: Partial<Inquiry>;
        Relationships: [
          {
            foreignKeyName: "inquiries_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: Customer;
        Insert: Partial<Customer> & { email: string; name: string };
        Update: Partial<Customer>;
        Relationships: [];
      };
      customer_notes: {
        Row: CustomerNote;
        Insert: Partial<CustomerNote> & { customer_id: string; body: string };
        Update: Partial<CustomerNote>;
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: Quote;
        Insert: Partial<Quote> & { quote_number: string; customer_id: string; items: QuoteLineItem[] };
        Update: Partial<Quote>;
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_inquiry_id_fkey";
            columns: ["inquiry_id"];
            isOneToOne: false;
            referencedRelation: "inquiries";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: Order;
        Insert: Partial<Order> & {
          order_number: string;
          customer_id: string;
          department: Department;
          items: QuoteLineItem[];
        };
        Update: Partial<Order>;
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_inquiry_id_fkey";
            columns: ["inquiry_id"];
            isOneToOne: false;
            referencedRelation: "inquiries";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: Review;
        Insert: Partial<Review> & {
          product_id: string;
          reviewer_name: string;
          reviewer_email: string;
          rating: number;
          body: string;
        };
        Update: Partial<Review>;
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      project_photos: {
        Row: ProjectPhoto;
        Insert: Partial<ProjectPhoto> & {
          department: Department;
          storage_path: string;
          submitter_name: string;
          submitter_email: string;
        };
        Update: Partial<ProjectPhoto>;
        Relationships: [
          {
            foreignKeyName: "project_photos_series_id_fkey";
            columns: ["series_id"];
            isOneToOne: false;
            referencedRelation: "series";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_inquiry_rate_limit: {
        Args: { p_identifier: string; p_max_count: number; p_window_seconds: number };
        Returns: boolean;
      };
      upsert_customer: {
        Args: { p_email: string; p_name: string; p_phone: string | null; p_department: string | null };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
