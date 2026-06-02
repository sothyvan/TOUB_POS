import { useMemo, useState } from 'react';
import { SERVICE_RATE } from '../data/seedData';

/**
 * Manages cart state and all derived totals.
 * @param {Map} categoryById - used to look up category name when adding items.
 */
export function useCart(categoryById) {
  const [cart, setCart] = useState([]);

  const addToCart = (product) => {
    const categoryName = categoryById.get(product.categoryId)?.name || 'Menu';
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (!existing) return [...current, { ...product, categoryName, quantity: 1 }];
      return current.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    });
  };

  const updateQuantity = (id, change) =>
    setCart((current) =>
      current
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + change } : item))
        .filter((item) => item.quantity > 0)
    );

  const setCartItemQuantity = (id, quantity) =>
    setCart((current) =>
      current
        .map((item) => (item.id === id ? { ...item, quantity: Math.max(0, quantity) } : item))
        .filter((item) => item.quantity > 0)
    );

  const removeItemFromCart = (productId) =>
    setCart((current) => current.filter((item) => item.id !== productId));

  const clearCart = () => setCart([]);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const serviceFee = Math.round(subtotal * SERVICE_RATE * 100) / 100;
  const total = subtotal + serviceFee;
  const cartById = useMemo(() => new Map(cart.map((item) => [item.id, item])), [cart]);

  return {
    cart, cartById, itemCount,
    subtotal, serviceFee, total,
    addToCart, updateQuantity, setCartItemQuantity, clearCart, removeItemFromCart,
  };
}
