export const SEED_MARKER = 'faker_demo_seed_v2';
export const KHR_RATE = 4100;
export const ORDER_COUNT = 75;
export const CASHIER_PIN = '1111';

export const CATEGORY_SEEDS = [
  { name: 'Cold Drinks', tone: 'blue' },
  { name: 'Hot Bowls', tone: 'gold' },
  { name: 'Street Snacks', tone: 'rose' },
  { name: 'Fresh Plates', tone: 'green' },
];

export const OWNER_SEEDS = [
  {
    username: 'owner',
    password: 'owner123',
    stalls: [
      { name: 'Stall A - Drinks', location: 'Main Booth', telegram_chat_id: -1002003004001 },
      { name: 'Stall B - Noodles', location: 'East Walkway', telegram_chat_id: -1002003004002 },
      { name: 'Stall C - Snacks', location: 'Garden Corner', telegram_chat_id: -1002003004003 },
    ],
    managers: [
      { username: 'manager_demo', password: 'manager123' },
    ],
    cashiers: [
      { username: 'cashier_dara', stallName: 'Stall A - Drinks' },
      { username: 'cashier_sophea', stallName: 'Stall B - Noodles' },
      { username: 'cashier_vireak', stallName: 'Stall C - Snacks' },
      { username: 'cashier_malis', stallName: 'Stall A - Drinks' },
    ],
  },
  {
    username: 'owner_bixby',
    password: 'owner123',
    stalls: [
      { name: 'Stall D - BBQ', location: 'North Pavilion', telegram_chat_id: -1002003004004 },
      { name: 'Stall E - Bakery', location: 'West Arcade', telegram_chat_id: -1002003004005 },
    ],
    managers: [
      { username: 'manager_bixby', password: 'manager123' },
    ],
    cashiers: [
      { username: 'cashier_bixby_1', stallName: 'Stall D - BBQ' },
      { username: 'cashier_bixby_2', stallName: 'Stall E - Bakery' },
    ],
  },
  {
    username: 'owner_clara',
    password: 'owner123',
    stalls: [
      { name: 'Stall F - Juice', location: 'South Terrace', telegram_chat_id: -1002003004006 },
      { name: 'Stall G - Dessert', location: 'Food Court', telegram_chat_id: -1002003004007 },
    ],
    managers: [
      { username: 'manager_clara', password: 'manager123' },
    ],
    cashiers: [
      { username: 'cashier_clara_1', stallName: 'Stall F - Juice' },
      { username: 'cashier_clara_2', stallName: 'Stall G - Dessert' },
    ],
  },
];

export const PRODUCT_SEEDS = [
  { name: 'Iced Palm Tea', categoryName: 'Cold Drinks', imageUrl: '/images/products/iced-palm-tea.jpg', baseUsd: 1.5 },
  { name: 'Lime Soda', categoryName: 'Cold Drinks', imageUrl: '/images/products/lime-soda.jpg', baseUsd: 1.75 },
  { name: 'Passion Fruit Cooler', categoryName: 'Cold Drinks', imageUrl: '/images/products/passion-fruit-cooler.jpg', baseUsd: 2.25 },
  { name: 'Beef Lok Lak Bowl', categoryName: 'Fresh Plates', imageUrl: '/images/products/beef-lok-lak-bowl.jpg', baseUsd: 4.5 },
  { name: 'Chicken Rice Plate', categoryName: 'Fresh Plates', imageUrl: '/images/products/chicken-rice-plate.jpg', baseUsd: 3.75 },
  { name: 'Green Mango Salad', categoryName: 'Fresh Plates', imageUrl: '/images/products/green-mango-salad.jpg', baseUsd: 3.25 },
  { name: 'Nom Banh Chok', categoryName: 'Hot Bowls', imageUrl: '/images/products/nom-banh-chok.jpg', baseUsd: 3 },
  { name: 'Spicy Noodle Soup', categoryName: 'Hot Bowls', imageUrl: '/images/products/spicy-noodle-soup.jpg', baseUsd: 3.5 },
  { name: 'Pork Wonton Bowl', categoryName: 'Hot Bowls', imageUrl: '/images/products/pork-wonton-bowl.jpg', baseUsd: 3.95 },
  { name: 'Fried Banana Bites', categoryName: 'Street Snacks', imageUrl: '/images/products/fried-banana-bites.jpg', baseUsd: 1.25 },
  { name: 'Spring Rolls', categoryName: 'Street Snacks', imageUrl: '/images/products/spring-rolls.jpg', baseUsd: 2.5 },
  { name: 'Grilled Skewers', categoryName: 'Street Snacks', imageUrl: '/images/products/grilled-skewers.jpg', baseUsd: 2.75 },
];
