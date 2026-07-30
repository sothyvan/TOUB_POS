import { findUserSessionById } from '../repositories/user.repository.js';

function sameNullableId(first, second) {
  const firstIsNull = first === null || first === undefined;
  const secondIsNull = second === null || second === undefined;
  if (firstIsNull && secondIsNull) {
    return true;
  }
  return Number(first) === Number(second);
}

export async function resolveActiveTokenSession(decodedUser) {
  const userId = Number(decodedUser?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  const currentUser = await findUserSessionById(userId);
  if (
    !currentUser
    || currentUser.is_deleted
    || !currentUser.is_active
    || Number(currentUser.session_version) !== Number(decodedUser.session_version)
    || currentUser.username !== decodedUser.username
    || currentUser.role !== decodedUser.role
    || !sameNullableId(currentUser.owner_id, decodedUser.owner_id)
  ) {
    return null;
  }

  return {
    ...decodedUser,
    id: currentUser.id,
    username: currentUser.username,
    role: currentUser.role,
    owner_id: currentUser.owner_id,
    session_version: currentUser.session_version,
  };
}
