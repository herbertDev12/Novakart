import Image from "next/image";
import { Product } from "../_data/products";

export type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const { name, price, imageUrl } = product;
	return (
    <>
      <Image src={imageUrl} alt={name} />
      <h1>{name}</h1>
      <p>price:{" " + price}</p>
    </>
  );
}
