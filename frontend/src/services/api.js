import { apiRequest } from './apiClient';
import { toDisplayRole } from '../utils/permissions';
import { upload as uploadImageKitFile } from '@imagekit/javascript';

const PRODUCT_IMAGE_FOLDER = '/toub-pos/products';
const MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PRODUCT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function sanitizeFileNamePart(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'product-photo';
}

function getFileExtension(file) {
  const extension = String(file.name || '').split('.').pop()?.toLowerCase();
  if (extension && ['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
    return extension;
  }

  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';

  return 'jpg';
}

function validateProductImageFile(file) {
  if (!file) {
    throw new Error('Choose an image file to upload.');
  }

  if (!ALLOWED_PRODUCT_IMAGE_TYPES.has(file.type)) {
    throw new Error('Product photos must be JPG, PNG, or WebP images.');
  }

  if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
    throw new Error('Product photos must be 5MB or smaller.');
  }
}

function mapProductToFrontend(p) {
  const directAssignments = p.ProductStalls || p.stall_products || [];
  const stallAssignments = p.Stalls
    ? p.Stalls.map(stall => ({
        stall_id: stall.id,
        price_usd: stall.ProductStall?.price_usd,
        price_khr: stall.ProductStall?.price_khr,
        is_visible: stall.ProductStall?.is_visible,
      }))
    : [];
  const assignments = directAssignments.length > 0 ? directAssignments : stallAssignments;
  const primaryAssignment = assignments[0] || p.ProductStall || {};
  const category = p.Category;

  return {
    id: p.id,
    name: p.name,
    code: p.name.substring(0, 3).toUpperCase(),
    price: primaryAssignment.price_usd ?? p.price_usd ?? 0,
    categoryId: p.category_id,
    stallId: primaryAssignment.stall_id ?? p.stall_id,
    stallIds: assignments.length > 0
      ? assignments.map(assignment => assignment.stall_id)
      : (p.Stalls ? p.Stalls.map(s => s.id) : (p.stall_id ? [p.stall_id] : [])),
    tone: category ? category.tone : 'gold',
    available: primaryAssignment.is_visible ?? false,
    image: p.image_url || ''
  };
}

function mapCategoryToFrontend(c) {
  return {
    id: c.id,
    name: c.name,
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
    role: toDisplayRole(u.role),
    active: u.is_active !== false,
    password: '',
    pin: '',
  };
}

function mapOrderToFrontend(o) {
  const id = o.id ?? o.orderId;
  const paymentMethod = String(o.payment_method || o.paymentMethod || '').toUpperCase();
  const cashier = o.Cashier || o.cashier || {};
  const stall = o.Stall || o.stall || {};
  const items = o.Items || o.items || [];

  return {
    id,
    orderNo: `ORD-${String(id).padStart(4, '0')}`,
    createdAt: o.created_at || o.createdAt,
    cashierId: o.cashier_id || o.cashierId,
    cashierName: cashier.username || cashier.name || o.cashierName || 'Cashier',
    stallId: o.stall_id || o.stallId,
    stallName: stall.location ? `${stall.name} — ${stall.location}` : (stall.name || o.stallName || 'Stall'),
    paymentMethod,
    status: o.status,
    qrPayload: o.qr_payload || o.qrPayload || null,
    qrMd5: o.qr_md5 || o.qrMd5 || null,
    paymentReference: o.payment_reference || o.paymentReference || null,
    paymentExpiresAt: o.payment_expires_at || o.paymentExpiresAt || null,
    subtotal: parseFloat(o.subtotal_usd || o.total_usd || 0),
    serviceFee: 0,
    estimatedTax: 0,
    total: parseFloat(o.total_usd || 0),
    items: items.map(i => ({
      id: i.id,
      productId: i.product_id,
      name: i.name,
      quantity: i.quantity,
      price: parseFloat(i.price_usd || 0),
      lineTotal: parseFloat(i.line_total_usd || 0),
      notes: i.notes || '',
    }))
  };
}

export const api = {
  products: {
    async getAll() {
      const res = await apiRequest('/products');
      return res.data.map(mapProductToFrontend);
    },
    async getImageUploadAuth() {
      const res = await apiRequest('/products/imagekit-auth');
      return res.data;
    },
    async uploadImage(file, onProgress, productName = '') {
      validateProductImageFile(file);
      const auth = await this.getImageUploadAuth();
      const fileName = `${sanitizeFileNamePart(productName)}-${Date.now()}.${getFileExtension(file)}`;

      return uploadImageKitFile({
        file,
        fileName,
        folder: PRODUCT_IMAGE_FOLDER,
        useUniqueFileName: true,
        publicKey: auth.publicKey,
        token: auth.token,
        expire: auth.expire,
        signature: auth.signature,
        onProgress,
      });
    },
    async save(item) {
      const payload = {
        name: item.name,
        price_usd: Number(item.price),
        price_khr: Number(item.price) * 4000,
        category_id: item.categoryId,
        stall_ids: item.stallIds || [],
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
      const payload = {
        name: item.name,
        tone: item.tone,
      };
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
      const role = String(item.role || '').trim().toLowerCase();
      const payload = { username: item.name, role, is_active: item.active };
      const password = String(item.password || '').trim();
      const pin = String(item.pin || '').trim();
      if (role === 'cashier') {
        if (pin) payload.pin = pin;
      } else if (password) {
        payload.password = password;
      }
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
    async getById(orderId) {
      const res = await apiRequest(`/orders/${orderId}`);
      return mapOrderToFrontend(res.data);
    },
    async checkKhqrStatus(orderId) {
      const res = await apiRequest(`/orders/${orderId}/check-khqr-status`, { method: 'POST' });
      return {
        ...res.data,
        order: res.data?.order ? mapOrderToFrontend(res.data.order) : null,
      };
    },
    async create(order) {
      const payload = {
        paymentMethod: order.paymentMethod,
        items: order.items.map(i => ({
          product_id: i.id,
          quantity: i.quantity,
          ...(i.notes ? { notes: i.notes } : {}),
        })),
      };
      const res = await apiRequest('/orders', { method: 'POST', body: payload });
      return mapOrderToFrontend(res.data);
    },
    async confirmCash(orderId) {
      const res = await apiRequest(`/orders/${orderId}/confirm-cash`, { method: 'POST' });
      return mapOrderToFrontend(res.data);
    },
  },
};
