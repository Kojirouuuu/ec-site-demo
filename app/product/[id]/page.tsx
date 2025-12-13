import { formatCurrency, getProductById } from "@/lib/data";
import Link from "next/link";

export default async function Page({ params }: {params: {id: string}}) {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const product = await getProductById(id);

    if (!product) return null; // getProductById()内でnotFound()を実行するため、ここは到達しない。

    return (
        <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">

                <div className="mb-6">
                    <Link href="/" className="text-sm text-blue-600 hover:text-blue-500 font-medium flex items-center gap-1">
                        &larr; Back to Products
                    </Link>
                </div>

                <div className="bg-white tounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        <div className="bg-gray-100 p-8 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-gray-200">
                            <div className="relative aspect-square w-full max-w-md">
                                <img src={`https://placehold.co/600x600/e3e8f0/1e293b?text=${product.category || 'Product'}`}
                                alt={product.category || "Product Image"}
                                className="w-full h-full object-cover rounded-lg shadow-lg"
                                />
                            </div>
                        </div>

                        {/* 右側: 情報エリア */}
                        <div className="p-8 lg:p-12 flex flex-col justify-center">
                            <div>
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                    {product.category || "Uncategorized"}
                                </span>

                                <h1 className="mt-4 text3-xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                                    {product.category || "Product Name"}
                                </h1>

                                <div className="mt-4 prose prose-sm text-gray-500">
                                    <p>{product.description || 'No detailed description available for this product.'}</p>
                                </div>
                            </div>

                            <div className="mt-10 pt-10 border-t border-gray-100">
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Price</p>
                                        <p className="text-3xl font-bold text-gray-900">
                                        {formatCurrency(product.price)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">Estimated Freight</p>
                                        <p className="text-lg font-medium text-gray-700">
                                        {formatCurrency(product.freight)}
                                        </p>
                                    </div>
                                    {/* カート追加ボタン（見た目だけ） */}
                                    <div className="mt-8">
                                        <button
                                            type="button"
                                            className="flex w-full items-center justify-center rounded-md border border-transparent bg-blue-600 px-8 py-3 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                        >
                                            Add to Cart
                                        </button>
                                        <p className="mt-2 text-center text-xs text-gray-400">
                                            * This is a demo. Cart functionality is not implemented yet.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}