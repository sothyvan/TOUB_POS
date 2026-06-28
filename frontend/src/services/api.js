import { apiRequest } from './apiClient';
export const STORAGE_KEYS = {
  ORDERS: 'sabay-pos-orders',
};

function mapProductToFrontend(p) {
  return {
    id: p.id,
    name: p.name,
    code: p.name.substring(0, 3).toUpperCase(),
    price: p.price_usd,
    categoryId: p.category_id,
    stallId: p.stall_id,
    tone: p.Category ? p.Category.tone : 'gold',
    available: p.is_visible,
    image: p.image_url || ''
  };
}

function mapCategoryToFrontend(c) {
  return {
    id: c.id,
    name: c.name,
    stallId: c.stall_id,
    tone: c.tone || 'gold'
  };
}

function mapStallToFrontend(s) {
  return {
    id: s.id,
    name: s.name,
    location: s.location,
    status: 'active',
    online: true,
    staff: s.Users ? s.Users.map(u => ({ id: u.id, name: u.username, role: u.role })) : []
  };
}

function mapUserToFrontend(u) {
  return {
    id: u.id,
    name: u.username,
    role: u.role,
    active: u.is_active !== false,
  };
}

function mapOrderToFrontend(o) {
  return {
    id: o.id,
    orderNo: `ORD-${String(o.id).padStart(4, '0')}`,
    createdAt: o.created_at || o.createdAt,
    cashierId: o.cashier_id || o.cashierId,
    stallId: o.stall_id || o.stallId,
    paymentMethod: o.payment_method || o.paymentMethod,
    status: o.status,
    subtotal: parseFloat(o.subtotal_usd || o.total_usd || 0),
    total: parseFloat(o.total_usd || 0),
    items: (o.Items || []).map(i => ({
      id: i.product_id,
      name: i.name,
      quantity: i.quantity,
      price: parseFloat(i.price_usd || 0),
      lineTotal: parseFloat(i.line_total_usd || 0),
    }))
  };
}

export const api = {
  products: {
    async getAll() {
      const res = await apiRequest('/products');
      return res.data.map(mapProductToFrontend);
    },
    async save(item) {
      const payload = {
        name: item.name,
        price_usd: Number(item.price),
        price_khr: Number(item.price) * 4000,
        category_id: item.categoryId,
        stall_id: item.stallId || 1,
        image_url: item.image,
        is_visible: item.available
      };
      if (item.id) {
        await apiRequest(`/products/${item.id}`, { method: 'PUT', body: payload });
        return { ...item };
      } else {
        const res = await apiRequest('/products', { method: 'POST', body: payload });
        return mapProductToFrontend(res.data);
      }
    },
    async delete(id) {
      return apiRequest(`/products/${id}`, { method: 'DELETE' });
    }
  },
  categories: {
    async getAll() {
      const res = await apiRequest('/categories');
      return res.data.map(mapCategoryToFrontend);
    },
    async save(item) {
      const payload = { name: item.name, tone: item.tone, stall_id: item.stallId || 1 };
      if (item.id) {
        await apiRequest(`/categories/${item.id}`, { method: 'PUT', body: payload });
        return { ...item };
      } else {
        const res = await apiRequest('/categories', { method: 'POST', body: payload });
        return mapCategoryToFrontend(res.data);
      }
    },
    async delete(id) {
      return apiRequest(`/categories/${id}`, { method: 'DELETE' });
    }
  },
  users: {
    async getAll() {
      const res = await apiRequest('/users');
      return res.data.map(mapUserToFrontend);
    },
    async save(item) {
      const payload = { username: item.name, password: item.pin, pin: item.pin, role: item.role, is_active: item.active };
      if (item.id) {
        await apiRequest(`/users/${item.id}`, { method: 'PUT', body: payload });
        return { ...item };
      } else {
        const res = await apiRequest('/users', { method: 'POST', body: payload });
        return mapUserToFrontend(res.data);
      }
    },
    async delete(id) {
      return apiRequest(`/users/${id}`, { method: 'DELETE' });
    }
  },
  stalls: {
    async getAll() {
      const res = await apiRequest('/stalls');
      return res.data.map(mapStallToFrontend);
    },
    async save(item) {
      const payload = { name: item.name };
      if (item.id) {
        await apiRequest(`/stalls/${item.id}`, { method: 'PUT', body: payload });
        return { ...item };
      } else {
        const res = await apiRequest('/stalls', { method: 'POST', body: payload });
        return mapStallToFrontend(res.data);
      }
    },
    async delete(id) {
      return apiRequest(`/stalls/${id}`, { method: 'DELETE' });
    },
    async assignStaff(stallId, userId) {
      return apiRequest(`/stalls/${stallId}/staff`, { method: 'POST', body: { userId } });
    },
    async unassignStaff(stallId, userId) {
      return apiRequest(`/stalls/${stallId}/staff/${userId}`, { method: 'DELETE' });
    }
  },
  auth: {
    async getMyStall() {
      try {
        const res = await apiRequest('/users/me/stall');
        return mapStallToFrontend(res.data);
      } catch (err) {
        if (err.status === 404) return null;
        throw err;
      }
    }
  },
  orders: {
    async getAll(role) {
      const normalizedRole = String(role || '').toLowerCase();
      const endpoint = (normalizedRole === 'cashier') ? '/orders/mine' : '/orders';
      const res = await apiRequest(endpoint);
      return res.data.map(mapOrderToFrontend);
    },
    async create(order) {
      const payload = {
        paymentMethod: order.paymentMethod,
        items: order.items.map(i => ({ product_id: i.id, quantity: i.quantity }))
      };
      const res = await apiRequest('/orders', { method: 'POST', body: payload });
      // The create endpoint returns just { orderId, qrPayload, totalUsd, status }
      // To keep things consistent, we should probably fetch the full order or just mock it locally based on the response.
      // But let's assume `useOrders` will re-fetch orders after create anyway, so we just return the minimal response.
      return res.data;
    },
  },
};
