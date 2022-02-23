import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart")

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      let newCart: Product[] = [...cart];
      const productStockAmount = await getProductStockAmount(productId)

      const productInCart = newCart.find(product => product.id === productId)
      const currentAmount = productInCart ? productInCart.amount : 0
      const amount = currentAmount + 1

      if (amount > productStockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      if (productInCart) {
        productInCart.amount = amount
      } else {
        const product = await api.get(`/products/${productId}`)

        const newProduct = {
          ...product.data,
          amount
        }
        newCart.push(newProduct)
      }
      
      setCart(newCart)
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart))
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExistsInCart = cart.find(product => product.id === productId)
      if (productExistsInCart) {
        const newCart = cart.filter(product => product.id !== productId)
        setCart(newCart)
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart))
      } else {
        throw Error()
      }
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (!amount || amount <= 0) return

    try {
      const productStockAmount = await getProductStockAmount(productId)
      if (productStockAmount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const newCart = cart.map(product => {
        if (product.id === productId) {
          product.amount = amount
        }
        return product
      })
      setCart(newCart)
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  async function getProductStockAmount(productId: number) {
    const productStock = await api.get<Stock>(`/stock/${productId}`)
    return productStock.data.amount;
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
