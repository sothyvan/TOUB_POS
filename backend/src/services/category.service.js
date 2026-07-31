import * as categoryRepository from '../repositories/category.repository.js';
import { httpError } from '../utils/http-error.util.js';
import { sequelize } from '../models/index.js';
import { AUDIT_ACTIONS, writeAdministrativeAudit } from './audit.service.js';

function resolveOwnerId(actor) {
  return actor.role === 'owner' ? actor.id : actor.owner_id;
}

async function requireOwnedCategory(categoryId, ownerId, options = {}) {
  const category = await categoryRepository.findCategoryById(categoryId, options);
  if (!category) {
    throw httpError('Category not found.', 404);
  }
  if (category.owner_id !== ownerId) {
    throw httpError('Forbidden: Category does not belong to your business.', 403);
  }
  return category;
}

export function listCategories(actor, query = {}) {
  return categoryRepository.findAllCategories(
    { owner_id: resolveOwnerId(actor) },
    query,
  );
}

export function createCategory(actor, payload, requestId) {
  if (!payload.name) {
    throw httpError('Category name is required.');
  }
  return sequelize.transaction(async (transaction) => {
    const category = await categoryRepository.insertCategory({
      name: payload.name,
      tone: payload.tone,
      owner_id: resolveOwnerId(actor),
    }, { transaction });
    await writeAdministrativeAudit({
      actor, action: AUDIT_ACTIONS.CATEGORY_CREATED, targetType: 'category',
      targetId: category.id, requestId,
      after: { name: category.name, tone: category.tone }, transaction,
    });
    return category;
  });
}

export function updateCategory(actor, categoryId, payload, requestId) {
  const ownerId = resolveOwnerId(actor);
  return sequelize.transaction(async (transaction) => {
    const category = await requireOwnedCategory(categoryId, ownerId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const updateData = {};
    if (payload.name !== undefined) {
      updateData.name = payload.name;
    }
    if (payload.tone !== undefined) {
      updateData.tone = payload.tone;
    }
    const success = await categoryRepository.updateCategoryById(
      categoryId,
      updateData,
      { transaction },
    );
    if (!success) {
      throw httpError('Category not found or no changes made.', 404);
    }
    await writeAdministrativeAudit({
      actor, ownerId, action: AUDIT_ACTIONS.CATEGORY_UPDATED, targetType: 'category',
      targetId: categoryId, requestId,
      before: { name: category.name, tone: category.tone },
      after: { name: updateData.name ?? category.name, tone: updateData.tone ?? category.tone },
      transaction,
    });
  });
}

export function deleteCategory(actor, categoryId, requestId) {
  const ownerId = resolveOwnerId(actor);
  return sequelize.transaction(async (transaction) => {
    const category = await requireOwnedCategory(categoryId, ownerId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const success = await categoryRepository.deleteCategoryById(categoryId, { transaction });
    if (!success) {
      throw httpError('Category not found.', 404);
    }
    await writeAdministrativeAudit({
      actor, ownerId, action: AUDIT_ACTIONS.CATEGORY_DELETED, targetType: 'category',
      targetId: categoryId, requestId, before: { name: category.name, tone: category.tone }, transaction,
    });
  });
}
