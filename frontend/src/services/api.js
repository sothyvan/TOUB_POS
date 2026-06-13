import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, DEFAULT_USERS } from '../data/seedData';
import { makeId } from '../utils/ids';
import { getStorageItem, setStorageItem } from '../utils/storage';

export const STORAGE_KEYS = {
  CATEGORIES: 'sabay-pos-categories-v3',
  PRODUCTS: 'sabay-pos-products-v3',
  USERS: 'sabay-pos-users',
  ORDERS: 'sabay-pos-orders',
};

function createCrudResource(storageKey, defaultData, prefix) {
  return {
    getAll() {
      return getStorageItem(storageKey, defaultData);
    },
    save(item) {
      const items = this.getAll();
      let updatedItem = { ...item };
      
      if (!item.id) {
        updatedItem.id = makeId(prefix);
        items.push(updatedItem);
      } else {
        const index = items.findIndex((i) => i.id === item.id);
        if (index !== -1) {
          items[index] = updatedItem;
        } else {
          items.push(updatedItem);
        }
      }
      setStorageItem(storageKey, items);
      return updatedItem;
    },
    delete(id) {
      const items = this.getAll().filter((i) => i.id !== id);
      setStorageItem(storageKey, items);
    },
  };
}

export const api = {
  products: createCrudResource(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS, 'prod'),
  categories: createCrudResource(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES, 'cat'),
  users: createCrudResource(STORAGE_KEYS.USERS, DEFAULT_USERS, 'user'),
  orders: {
    getAll() {
      return getStorageItem(STORAGE_KEYS.ORDERS, []);
    },
    create(order) {
      const orders = this.getAll();
      const newOrder = {
        ...order,
        id: order.id || makeId('order'),
        orderNo: order.orderNo || `ORD-${String(orders.length + 1).padStart(4, '0')}`,
        createdAt: order.createdAt || new Date().toISOString(),
      };
      orders.unshift(newOrder);
      setStorageItem(STORAGE_KEYS.ORDERS, orders);
      return newOrder;
    },
  },
};
