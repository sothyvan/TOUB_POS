import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, DEFAULT_USERS } from '../data/seedData';
import { makeId } from '../utils/ids';

const STORAGE_KEYS = {
  CATEGORIES: 'sabay-pos-categories-v3',
  PRODUCTS: 'sabay-pos-products-v3',
  USERS: 'sabay-pos-users',
  ORDERS: 'sabay-pos-orders',
};

function getStorageItem(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error);
  }
}

export const api = {
  products: {
    getAll() {
      return getStorageItem(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    },
    save(product) {
      const products = this.getAll();
      let updatedProduct = { ...product };
      
      if (!product.id) {
        updatedProduct.id = makeId('prod');
        products.push(updatedProduct);
      } else {
        const index = products.findIndex((p) => p.id === product.id);
        if (index !== -1) {
          products[index] = updatedProduct;
        } else {
          products.push(updatedProduct);
        }
      }
      setStorageItem(STORAGE_KEYS.PRODUCTS, products);
      return updatedProduct;
    },
    delete(id) {
      const products = this.getAll().filter((p) => p.id !== id);
      setStorageItem(STORAGE_KEYS.PRODUCTS, products);
    },
  },
  categories: {
    getAll() {
      return getStorageItem(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    },
    save(category) {
      const categories = this.getAll();
      let updatedCategory = { ...category };
      
      if (!category.id) {
        updatedCategory.id = makeId('cat');
        categories.push(updatedCategory);
      } else {
        const index = categories.findIndex((c) => c.id === category.id);
        if (index !== -1) {
          categories[index] = updatedCategory;
        } else {
          categories.push(updatedCategory);
        }
      }
      setStorageItem(STORAGE_KEYS.CATEGORIES, categories);
      return updatedCategory;
    },
    delete(id) {
      const categories = this.getAll().filter((c) => c.id !== id);
      setStorageItem(STORAGE_KEYS.CATEGORIES, categories);
    },
  },
  users: {
    getAll() {
      return getStorageItem(STORAGE_KEYS.USERS, DEFAULT_USERS);
    },
    save(user) {
      const users = this.getAll();
      let updatedUser = { ...user };
      
      if (!user.id) {
        updatedUser.id = makeId('user');
        users.push(updatedUser);
      } else {
        const index = users.findIndex((u) => u.id === user.id);
        if (index !== -1) {
          users[index] = updatedUser;
        } else {
          users.push(updatedUser);
        }
      }
      setStorageItem(STORAGE_KEYS.USERS, users);
      return updatedUser;
    },
    delete(id) {
      const users = this.getAll().filter((u) => u.id !== id);
      setStorageItem(STORAGE_KEYS.USERS, users);
    },
  },
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
