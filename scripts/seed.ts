import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import csv from "csv-parser";

interface TranslationRow {
    product_category_name: string;
    product_category_name_english: string;
}

interface ProductRow {
    product_id: string;
    product_category_name: string;
    product_name_lenght: string;
    product_description_lenght: string;
    product_photos_qty: string;
    product_weight_g: string;
    product_length_cm: string;
    product_height_cm: string;
    product_width_cm: string;
}

interface OrderItemRow {
    order_id: string;
    order_item_id: string;
    product_id: string;
    seller_id: string;
    shipping_limit_date: string;
    price: string;
    freight_value: string;
}

async function main() {
    console.log("Start seeding...");

    // カテゴリマップの作成
    const translations = new Map<string, string>();

    interface Translation {
        product_category_name: string;
        product_category_name_english: string;
    }

    interface Product {
        id: string;
        categoryName: string;
        description: string;
        nameLength: number | null;
        descriptionLength: number | null;
        photosQty: number | null;
        weight: number | null;
        length: number | null;
        height: number | null;
        width: number | null;
    }

        const translationData: Array<{ cagegoryName: string; cagegoryNameEng: string }> = [];

        await new Promise<void>((resolve, reject) => {
            fs.createReadStream(path.join(__dirname, "..", "archive", "product_category_name_translation.csv"))
            .pipe(csv())
            .on("data", (row: any) => {
                // BOM文字を削除してキーを正規化
                const normalizedRow: any = {};
                for (const key in row) {
                    const normalizedKey = key.replace(/^\ufeff/, '');
                    normalizedRow[normalizedKey] = row[key];
                }
                const categoryName = normalizedRow.product_category_name;
                const categoryNameEng = normalizedRow.product_category_name_english;
                if (categoryName && categoryNameEng) {
                    translations.set(categoryName, categoryNameEng);
                    translationData.push({
                        cagegoryName: categoryName,
                        cagegoryNameEng: categoryNameEng,
                    });
                }
            })
            .on("end", resolve)
            .on("error", reject);
        })
        console.log(`Loaded ${translations.size} translations.`);

        // 翻訳データをデータベースに挿入
        if (translationData.length > 0) {
            await prisma.productCategoryTranslation.createMany({
                data: translationData,
                skipDuplicates: true,
            });
            console.log(`Inserted ${translationData.length} translations into database.`);
        }

        const products: Product[] = [];

        await new Promise<void>((resolve, reject) => {
            fs.createReadStream(path.join(__dirname, "..", "archive", "olist_products_dataset.csv"))
            .pipe(csv())
            .on("data", (row: ProductRow) => {
                if (row.product_id) {
                    const categoryName: string = row.product_category_name || "uncategorized";
                    const categoryNameEng: string = translations.get(categoryName) || categoryName;

                    products.push({
                        id: row.product_id,
                        categoryName: categoryNameEng,
                        description: `Product in category ${categoryNameEng}`,
                        nameLength: row.product_name_lenght ? parseInt(row.product_name_lenght, 10) : null,
                        descriptionLength: row.product_description_lenght ? parseInt(row.product_description_lenght, 10) : null,
                        photosQty: row.product_photos_qty ? parseInt(row.product_photos_qty, 10) : null,
                        weight: row.product_weight_g ? parseInt(row.product_weight_g, 10) : null,
                        length: row.product_length_cm ? parseInt(row.product_length_cm, 10) : null,
                        height: row.product_height_cm ? parseInt(row.product_height_cm, 10) : null,
                        width: row.product_width_cm ? parseInt(row.product_width_cm, 10) : null,
                    })
            }
        })
        .on("end", resolve)
        .on("error", reject);
    })

    console.log(`Parsed ${products.length} products. Inserting into DB...`);

    await prisma.product.createMany({
        data: products,
        skipDuplicates: true,
    })

    const orderItems: OrderItemRow[] = [];

    await new Promise((resolve, reject) => {
        fs.createReadStream(path.join(__dirname, "..", "archive", "olist_order_items_dataset.csv"))
        .pipe(csv())
        .on("data", (row: OrderItemRow) => {
            orderItems.push({
                order_id: row.order_id,
                order_item_id: row.order_item_id,
                product_id: row.product_id,
                seller_id: row.seller_id,
                shipping_limit_date: row.shipping_limit_date,
                price: row.price,
                freight_value: row.freight_value,
            })
        })
        .on("end", resolve)
        .on("error", reject);
    })

    console.log(`Parsed ${orderItems.length} order items. Inserting into DB...`);

    const SLICE_SIZE = 5000;
    for (let i = 0; i < orderItems.length; i += SLICE_SIZE) {
        const slice = orderItems.slice(i, i + SLICE_SIZE);
        await prisma.orderItem.createMany({
            data: slice.map((item) => ({
                orderId: item.order_id,
                orderItemId: item.order_item_id,
                productId: item.product_id,
                shippingLimitDate: new Date(item.shipping_limit_date),
                freight: parseFloat(item.freight_value),
                price: parseFloat(item.price),
            })),
            skipDuplicates: true,
        })
        console.log(`Inserted ${i + slice.length} / ${orderItems.length} order items...`);
    }
    console.log("Seeding finished.");
}

main()
.catch((e) => {
    console.error(e);
    process.exit(1);
})
.finally(async () => {
    await prisma.$disconnect();
});