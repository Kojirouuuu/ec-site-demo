import { getProducts } from "@/lib/data";
import ProductCard from "./ui/ProductCard";
import SearchBar from "@/app/ui/SearchBar";

export default async function Home({
  searchParams,
}: {
  searchParams?: {
    query?: string;
  };
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.query || "";
  const products = await getProducts(query);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* ヘッダーエリア */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Olist Store
            </h1>
            <p className="mt-1 text-gray-500">
              E-Commerce Demo
            </p>
          </div>
          <div className="w-full md:w-1/3">
            <SearchBar />
          </div>
        </div>

        {/* 商品グリッド */}
        {products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">No products found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
              key={product.id}
              {...product}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
