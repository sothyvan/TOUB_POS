import { Op } from 'sequelize';
import {
  Order,
  OrderItem,
  Stall,
  TelegramTicket,
  User,
} from '../../models/index.js';
import {
  parsePagination,
  buildOrderClause,
  paginatedResponse,
} from '../../utils/pagination.js';
import { httpError } from '../../utils/http-error.util.js';
import {
  buildOrderAccessInclude,
  buildOrderInclude,
  canAccessOrder,
  getOrderById,
  parsePositiveInteger,
} from './order-access.js';

export async function getOrderForActor(orderId, actor) {
  const parsedOrderId = parsePositiveInteger(orderId, 'order ID');
  parsePositiveInteger(actor?.id, 'actor ID');
  const order = await Order.findByPk(parsedOrderId, {
    include: buildOrderAccessInclude(),
  });

  if (!order) {
    throw httpError('Order not found.', 404);
  }
  if (!canAccessOrder(order, actor)) {
    throw httpError('You cannot access this order.', 403);
  }
  return getOrderById(parsedOrderId);
}

export async function getAllOrders(ownerId, queryOptions = {}) {
  const pagination = parsePagination(queryOptions);
  const { search, startDate, endDate, status } = queryOptions;
  const orderClause = buildOrderClause(
    pagination,
    ['created_at', 'id', 'status', 'total_usd'],
    [['created_at', 'DESC']],
  );

  const where = {};
  if (startDate && endDate) {
    where.created_at = { [Op.between]: [startDate, endDate] };
  }
  if (status) {
    where.status = status;
  }
  if (search) {
    where[Op.or] = [
      { id: { [Op.eq]: search.replace('#', '') } },
    ];
  }

  const include = ownerId
    ? [
        { model: OrderItem, as: 'Items' },
        { model: TelegramTicket, as: 'TelegramTickets' },
        {
          model: Stall,
          where: { owner_id: ownerId },
          attributes: ['id', 'name', 'location', 'telegram_chat_id'],
        },
        {
          model: User,
          as: 'Cashier',
          attributes: ['id', 'username', 'role'],
        },
      ]
    : buildOrderInclude();

  const { rows, count } = await Order.findAndCountAll({
    where,
    include,
    order: orderClause,
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true,
  });
  return paginatedResponse({ rows, count }, pagination);
}

export async function getOrdersByUser(cashierId, queryOptions = {}) {
  const pagination = parsePagination(queryOptions);
  const orderClause = buildOrderClause(
    pagination,
    ['created_at', 'id', 'status', 'total_usd'],
    [['created_at', 'DESC']],
  );
  const { rows, count } = await Order.findAndCountAll({
    where: { cashier_id: cashierId },
    include: buildOrderInclude(),
    order: orderClause,
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true,
  });
  return paginatedResponse({ rows, count }, pagination);
}
