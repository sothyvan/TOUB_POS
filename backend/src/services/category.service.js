import * as categoryRepository from '../repositories/category.repository.js';
import { httpError } from '../utils/http-error.util.js';

function resolveOwnerId(actor) {
  return actor.role === 'owner' ? actor.id : actor.owner_id;
}

async function requireOwnedCategory(categoryId, ownerId) {
  const category = await categoryRepository.findCategoryById(categoryId);
  if (!category) {
    throw httpError('Category not found.', 404);
  }
  if (category.owner_id !== ownerId) {
    throw httpError('Forbidden: Category does not belong to your business.', 403);
  }
}

export function listCategories(actor, query = {}) {
  return categoryRepository.findAllCategories(
    { owner_id: resolveOwnerId(actor) },
    query,
  );
}

export function createCategory(actor, payload) {
  if (!payload.name) {
    throw httpError('Category name is required.');
  }
  return categoryRepository.insertCategory({
    name: payload.name,
    tone: payload.tone,
    owner_id: resolveOwnerId(actor),
  });
}

export async function updateCategory(actor, categoryId, payload) {
  await requireOwnedCategory(categoryId, resolveOwnerId(actor));
  const updateData = {};
  if (payload.name !== undefined) {
    updateData.name = payload.name;
  }
  if (payload.tone !== undefined) {
    updateData.tone = payload.tone;
  }
  const success = await categoryRepository.updateCategoryById(categoryId, updateData);
  if (!success) {
    throw httpError('Category not found or no changes made.', 404);
  }
}

export async function deleteCategory(actor, categoryId) {
  await requireOwnedCategory(categoryId, resolveOwnerId(actor));
  const success = await categoryRepository.deleteCategoryById(categoryId);
  if (!success) {
    throw httpError('Category not found.', 404);
  }
}
