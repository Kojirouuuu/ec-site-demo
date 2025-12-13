import { formatCurrency } from "@/lib/data";
import Link from "next/link";

interface ProductCardProps {
    id: string;
    category: string | null;
    description: string | null;
    price: number;
}

export default function ProductCard({ id, category, description, price }: ProductCardProps) {
    return (
        <Link
        href={`/product/${id}`}
        className="group block overflow-hidden rounded-lg border border-gray-200 bg-white hover:shadow-lg transition-shadow"
        >
            {/* ダミー画像エリア */}
            <div className="aspect-square w-full bg-gray-100 relative">
                <img
                src={`https://placehold.co/400x400/e2e8f0/1e293b?text=${category || "Product"}`}
                alt={category || "Product"}
                className="h-full w-full object-cover object-center group-hover:opacity-75 transition-opacity"
                />
            </div>
            <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 line-clamp-1">
                    {category || "Product"}
                </h3>
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {description || "No description available"}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                    {formatCurrency(price)}
                </p>
            </div>
        </Link>
    )
}