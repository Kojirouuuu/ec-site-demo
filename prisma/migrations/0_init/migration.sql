-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "products" (
    "product_id" TEXT NOT NULL,
    "product_category_name" TEXT,
    "description" TEXT,
    "product_name_lenght" INTEGER,
    "product_description_lenght" INTEGER,
    "product_photos_qty" INTEGER,
    "product_weight_g" INTEGER,
    "product_length_cm" INTEGER,
    "product_height_cm" INTEGER,
    "product_width_cm" INTEGER,

    CONSTRAINT "products_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "product_category_name_translation" (
    "product_category_name" TEXT NOT NULL,
    "product_category_name_english" TEXT NOT NULL,

    CONSTRAINT "product_category_name_translation_pkey" PRIMARY KEY ("product_category_name")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "shipping_limit_date" TIMESTAMP(3) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "freight_value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "order_id" TEXT NOT NULL,
    "order_status" TEXT NOT NULL DEFAULT 'unavailable',
    "order_purchase_timestamp" TIMESTAMP(3) NOT NULL,
    "order_approved_at" TIMESTAMP(3),
    "order_delivered_carrier_date" TIMESTAMP(3),
    "order_delivered_customer_date" TIMESTAMP(3),
    "order_estimated_delivery_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("order_id")
);

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

