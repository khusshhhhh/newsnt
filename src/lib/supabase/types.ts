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

export type Category = {
  id: string;
  department: Department;
  name: string;
  slug: string;
  display_order: number;
  created_at: string;
};

export type ProductSpecs = Record<string, string>;

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
  display_order: number;
  created_at: string;
};

export type ProductVariantWithImages = ProductVariant & {
  product_images: ProductImage[];
};

export type ProductWithRelations = Product & {
  series: Series | null;
  category: Category;
  product_images: ProductImage[];
  variants: ProductVariantWithImages[];
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
      categories: {
        Row: Category;
        Insert: Partial<Category> & { name: string; slug: string; department: Department };
        Update: Partial<Category>;
        Relationships: [];
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
