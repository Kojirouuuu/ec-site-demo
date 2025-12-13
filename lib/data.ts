import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
};

// 商品一覧取得関数
export async function getProducts(query?: string) {
    const where = query ? {
        OR: [
            { desctiption: { contains: query, mode: "insensitive" as const}},
            { categoryName: { contains: query, mode: "insensitive" as const}},
        ],
    } : {};

    const products = await prisma.product.findMany({
        where,
        take: 20,
        include: {
            orderItems: {
                take: 1, // MVPなので、一度に表示するのは20件にします。
                select: { price: true },
            }
        }
    });

    return products.map((p) => ({
        id: p.id,
        category: p.categoryName,
        description: p.description,
        price: p.orderItems[0]?.price || 0,
    }));
}

// IDによる商品詳細取得関数
export async function getProductById(id: string) {
    const product = await prisma.product.findUnique({
        where: { id: id },
        include: {
            orderItems: {
                take: 1,
                select: {
                    price: true,
                    freight: true,
                }
            }
        }
    })

    if (!product) {
        notFound();
        return null;
    }

    return {
        id: product.id,
        category: product.categoryName,
        description: product.description,
        price: product.orderItems[0]?.price || 0,
        freight: product.orderItems[0]?.freight || 0,
    }
}