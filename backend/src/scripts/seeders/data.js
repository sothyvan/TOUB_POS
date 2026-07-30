export const SEED_MARKER = 'faker_demo_seed_v2';
export const KHR_RATE = 4100;
export const ORDER_COUNT = 75;
export const CASHIER_PIN = '1111';

export const OWNER_SEEDS = [
  // ── Owner: General Food Court ─────────────────────────────
  {
    username: 'owner',
    password: 'owner123',
    stalls: [
      { name: 'Stall A - Drinks', location: 'Main Booth' },
      { name: 'Stall B - Noodles', location: 'East Walkway' },
      { name: 'Stall C - Snacks', location: 'Garden Corner' },
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
    categories: [
      { name: 'Cold Drinks', tone: 'blue' },
      { name: 'Hot Bowls', tone: 'gold' },
      { name: 'Street Snacks', tone: 'rose' },
      { name: 'Fresh Plates', tone: 'green' },
    ],
    products: [
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
    ],
  },

  // ── Owner Bixby: BBQ & Bakery ─────────────────────────────
  {
    username: 'owner_bixby',
    password: 'owner123',
    stalls: [
      { name: 'Stall D - BBQ', location: 'North Pavilion' },
      { name: 'Stall E - Bakery', location: 'West Arcade' },
    ],
    managers: [
      { username: 'manager_bixby', password: 'manager123' },
    ],
    cashiers: [
      { username: 'cashier_bixby_1', stallName: 'Stall D - BBQ' },
      { username: 'cashier_bixby_2', stallName: 'Stall E - Bakery' },
    ],
    categories: [
      { name: 'BBQ Grill', tone: 'rose' },
      { name: 'Bakery', tone: 'gold' },
      { name: 'Sides', tone: 'green' },
    ],
    products: [
      { name: 'Pork Skewers', categoryName: 'BBQ Grill', imageUrl: '/images/products/pork-skewers.jpg', baseUsd: 3.5 },
      { name: 'Grilled Chicken Wings', categoryName: 'BBQ Grill', imageUrl: '/images/products/grilled-chicken-wings.jpg', baseUsd: 4.0 },
      { name: 'Beef Ribs', categoryName: 'BBQ Grill', imageUrl: '/images/products/beef-ribs.jpg', baseUsd: 5.5 },
      { name: 'Croissant', categoryName: 'Bakery', imageUrl: '/images/products/croissant.jpg', baseUsd: 2.0 },
      { name: 'Baguette', categoryName: 'Bakery', imageUrl: '/images/products/baguette.jpg', baseUsd: 1.5 },
      { name: 'Cinnamon Roll', categoryName: 'Bakery', imageUrl: '/images/products/cinnamon-roll.jpg', baseUsd: 2.5 },
      { name: 'French Fries', categoryName: 'Sides', imageUrl: '/images/products/french-fries.jpg', baseUsd: 2.0 },
      { name: 'Coleslaw', categoryName: 'Sides', imageUrl: '/images/products/coleslaw.jpg', baseUsd: 1.5 },
      { name: 'Corn on the Cob', categoryName: 'Sides', imageUrl: '/images/products/corn-on-the-cob.jpg', baseUsd: 2.0 },
    ],
  },

  // ── Owner Clara: Juice & Desserts ──────────────────────────
  {
    username: 'owner_clara',
    password: 'owner123',
    stalls: [
      { name: 'Stall F - Juice', location: 'South Terrace' },
      { name: 'Stall G - Dessert', location: 'Food Court' },
    ],
    managers: [
      { username: 'manager_clara', password: 'manager123' },
    ],
    cashiers: [
      { username: 'cashier_clara_1', stallName: 'Stall F - Juice' },
      { username: 'cashier_clara_2', stallName: 'Stall G - Dessert' },
    ],
    categories: [
      { name: 'Fresh Juice', tone: 'green' },
      { name: 'Desserts', tone: 'rose' },
    ],
    products: [
      { name: 'Orange Juice', categoryName: 'Fresh Juice', imageUrl: '/images/products/orange-juice.jpg', baseUsd: 2.0 },
      { name: 'Mango Smoothie', categoryName: 'Fresh Juice', imageUrl: '/images/products/mango-smoothie.jpg', baseUsd: 2.5 },
      { name: 'Watermelon Juice', categoryName: 'Fresh Juice', imageUrl: '/images/products/watermelon-juice.jpg', baseUsd: 1.75 },
      { name: 'Ice Cream', categoryName: 'Desserts', imageUrl: '/images/products/ice-cream.jpg', baseUsd: 1.5 },
      { name: 'Mochi', categoryName: 'Desserts', imageUrl: '/images/products/mochi.jpg', baseUsd: 2.0 },
      { name: 'Fruit Tart', categoryName: 'Desserts', imageUrl: '/images/products/fruit-tart.jpg', baseUsd: 3.0 },
    ],
  },
];
