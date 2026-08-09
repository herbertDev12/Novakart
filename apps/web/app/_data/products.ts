export type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
};

export const products: Product[] = [
  {
    id: "1",
    name: "Urban Backpack",
    price: 45.99,
    imageUrl: "/products/urban-backpack.jpg",
    category: "accessories",
  },
  {
    id: "2",
    name: "Wireless Headphones",
    price: 79.5,
    imageUrl: "/products/wireless-headphones.jpg",
    category: "electronics",
  },
  {
    id: "3",
    name: "Thermal Bottle",
    price: 18.0,
    imageUrl: "/products/thermal-bottle.jpg",
    category: "home",
  },
  {
    id: "4",
    name: "Mechanical Keyboard",
    price: 120.0,
    imageUrl: "/products/mechanical-keyboard.jpg",
    category: "electronics",
  },
  {
    id: "5",
    name: "Desk Lamp",
    price: 32.75,
    imageUrl: "/products/desk-lamp.jpg",
    category: "home",
  },
  {
    id: "6",
    name: "Leather Wallet",
    price: 27.3,
    imageUrl: "/products/leather-wallet.jpg",
    category: "accessories",
  },
];
