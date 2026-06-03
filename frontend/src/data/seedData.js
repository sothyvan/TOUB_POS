export const SERVICE_RATE = 0.05;
export const ROLES = ['Admin', 'Manager', 'Cashier'];
export const TONES = ['gold', 'green', 'blue', 'rose'];

export const DEFAULT_CATEGORIES = [
  { id: 'cat-coffee', name: 'Coffee', tone: 'gold' },
  { id: 'cat-tea', name: 'Tea', tone: 'green' },
  { id: 'cat-frappe', name: 'Frappe', tone: 'blue' },
  { id: 'cat-pastries', name: 'Pastries', tone: 'rose' },
];

export const DEFAULT_PRODUCTS = [
  { id: 'prod-latte', name: 'Iced Latte', price: 1.5, categoryId: 'cat-coffee', tone: 'gold', code: 'LAT', available: true },
  { id: 'prod-americano', name: 'Iced Americano', price: 1.25, categoryId: 'cat-coffee', tone: 'gold', code: 'AME', available: true },
  { id: 'prod-condensed', name: 'Condensed Milk Coffee', price: 1.25, categoryId: 'cat-coffee', tone: 'gold', code: 'CMC', available: true },
  { id: 'prod-passion-tea', name: 'Passion Cream Green Tea', price: 1.5, categoryId: 'cat-tea', tone: 'green', code: 'PGT', available: true },
  { id: 'prod-matcha', name: 'Matcha Latte', price: 1.75, categoryId: 'cat-tea', tone: 'green', code: 'MAT', available: true },
  { id: 'prod-lemon-tea', name: 'Lemon Black Tea', price: 1.25, categoryId: 'cat-tea', tone: 'green', code: 'LBT', available: true },
  { id: 'prod-frappe', name: 'Chocolate Frappe', price: 2, categoryId: 'cat-frappe', tone: 'blue', code: 'FRP', available: true },
  { id: 'prod-croissant', name: 'Croissant', price: 1.5, categoryId: 'cat-pastries', tone: 'rose', code: 'CRS', available: true },
];

export const DEFAULT_USERS = [
  { id: 'user-admin', name: 'Admin Dara', role: 'Admin', station: 'Back Office', pin: '1234', active: true },
  { id: 'user-manager', name: 'Manager Lina', role: 'Manager', station: 'Back Office', pin: '2222', active: true },
  { id: 'user-cashier', name: 'Cashier Dara', role: 'Cashier', station: 'Station 01', pin: '1111', active: true },
];
