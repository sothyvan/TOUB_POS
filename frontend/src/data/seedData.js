export const SERVICE_RATE = 0.03;
export const TAX_RATE = 0.08;
export const ROLES = ['Owner', 'Manager', 'Cashier'];
export const TONES = ['gold', 'green', 'blue', 'rose'];

export const DEFAULT_CATEGORIES = [
  { id: 'cat-drinks', name: 'Drinks', tone: 'gold' },
  { id: 'cat-meals', name: 'Meals', tone: 'green' },
  { id: 'cat-bakery', name: 'Bakery', tone: 'rose' },
];

export const DEFAULT_PRODUCTS = [
  { id: 'prod-cold-brew', name: 'Cold Brew Coffee', price: 4.5, categoryId: 'cat-drinks', tone: 'gold', code: 'CBC', available: true, image: '/images/b5d0659db0a955c132d400af28b50f1da0066a33.png' },
  { id: 'prod-orange-juice', name: 'Cold Pressed Orange', price: 3.25, categoryId: 'cat-drinks', tone: 'gold', code: 'CPO', available: true, image: '/images/980927e75686f180e20defd279c6edf55d899038.png' },
  { id: 'prod-wagyu-burger', name: 'Classic Wagyu Burger', price: 12.95, categoryId: 'cat-meals', tone: 'green', code: 'CWB', available: true, image: '/images/6b1b0d638077fd6d8d13d20e09345b700a972913.png' },
  { id: 'prod-quinoa-bowl', name: 'Superfood Quinoa Bowl', price: 10.0, categoryId: 'cat-meals', tone: 'green', code: 'SQB', available: true, image: '/images/1aa2b69b2053772c0063b4af0e1996e155379084.png' },
  { id: 'prod-chicken-salad', name: 'Grilled Chicken Salad', price: 11.5, categoryId: 'cat-meals', tone: 'green', code: 'GCS', available: true, image: '/images/c79802d98f0e95604c702d53aa785bfaa114180a.png' },
  { id: 'prod-sourdough', name: 'Artisan Sourdough', price: 6.0, categoryId: 'cat-bakery', tone: 'rose', code: 'ASD', available: true, image: '/images/beb15cdbf755ea81565147d0ea0990a531d4b2a3.png' },
  { id: 'prod-berry-tart', name: 'Mixed Berry Tart', price: 5.5, categoryId: 'cat-bakery', tone: 'rose', code: 'MBT', available: true, image: '/images/36a8fdad73ae01cb5d570fd6a75fb530768943cb.png' },
  { id: 'prod-chocolate-donut', name: 'Chocolate Glazed Donut', price: 2.75, categoryId: 'cat-bakery', tone: 'rose', code: 'CGD', available: true, image: '/images/e13bb30e6a6b00f34a19e3b6807c3a0eccb6f551.png' },
];

export const DEFAULT_USERS = [
  { id: 'user-owner', name: 'Owner Dara', role: 'Owner', station: 'Back Office', active: true },
  { id: 'user-manager', name: 'Manager Bopha', role: 'Manager', station: 'Back Office', active: true },
  { id: 'user-cashier', name: 'Cashier Dara', role: 'Cashier', station: 'Station 01', active: true },
];
