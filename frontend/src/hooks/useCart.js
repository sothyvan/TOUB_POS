import { useEffect, useMemo, useState } from 'react';
import {
  clearRecoveredCart,
  createCashierRecoveryScope,
  readRecoveredCart,
  reconcileRecoveredCart,
  writeRecoveredCart,
} from '../utils/cartRecovery';
import { calculateCurrentDisplayTotal } from '../../config/financial-policy';

const adjustQuantity = (current, id, getNewQty) =>
  current.reduce((acc, item) => {
    if (item.id === id) {
      const newQty = getNewQty(item.quantity);
      if (newQty > 0) {
        acc.push({ ...item, quantity: newQty });
      }
    } else {
      acc.push(item);
    }
    return acc;
  }, []);

/**
 * Manages cart state and all derived totals.
 * @param {Map} categoryById - used to look up category name when adding items.
 * @param {Object} options
 */
export function useCart(categoryById, options = {}) {
  const { currentUser = null, products = [], productsLoading = false } = options;
  const [cart, setCart] = useState([]);
  const [hydratedScopeKey, setHydratedScopeKey] = useState(null);
  const recoveryScope = useMemo(
    () => createCashierRecoveryScope(currentUser),
    [currentUser],
  );

  useEffect(() => {
    let timerId;

    if (!recoveryScope) {
      timerId = window.setTimeout(() => {
        setCart([]);
        setHydratedScopeKey(null);
      }, 0);
      return () => window.clearTimeout(timerId);
    }
    if (productsLoading || hydratedScopeKey === recoveryScope.key) return undefined;

    const restored = reconcileRecoveredCart(
      readRecoveredCart(recoveryScope),
      products,
      categoryById,
    );
    timerId = window.setTimeout(() => {
      setCart(restored);
      setHydratedScopeKey(recoveryScope.key);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [
    categoryById,
    hydratedScopeKey,
    products,
    productsLoading,
    recoveryScope,
  ]);

  useEffect(() => {
    if (!recoveryScope || hydratedScopeKey !== recoveryScope.key) return;
    writeRecoveredCart(recoveryScope, cart);
  }, [cart, hydratedScopeKey, recoveryScope]);

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
    setCart((current) => adjustQuantity(current, id, (q) => q + change));

  const setCartItemQuantity = (id, quantity) =>
    setCart((current) => adjustQuantity(current, id, () => Math.max(0, quantity)));

  const removeItemFromCart = (productId) =>
    setCart((current) => current.filter((item) => item.id !== productId));

  const clearCart = () => {
    clearRecoveredCart(recoveryScope);
    setCart([]);
  };

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotalKhr = cart.reduce((sum, item) => sum + Number(item.priceKhr || 0) * item.quantity, 0);
  const total = calculateCurrentDisplayTotal(subtotal);
  const cartById = useMemo(() => new Map(cart.map((item) => [item.id, item])), [cart]);

  return {
    cart, cartById, itemCount,
    subtotal, total, subtotalKhr, totalKhr: subtotalKhr,
    addToCart, updateQuantity, setCartItemQuantity, clearCart, removeItemFromCart,
  };
}
