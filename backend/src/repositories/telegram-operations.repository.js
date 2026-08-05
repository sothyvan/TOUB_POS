import { QueryTypes } from 'sequelize';
import { sequelize, Stall } from '../models/index.js';

const ACTIONABLE_LIMIT = 20;
const LATENCY_SAMPLE_LIMIT = 500;

function stallPredicate(stallId) {
  return stallId ? 'AND s.id = :stallId' : '';
}

export function findOwnedOperationsStall(ownerId, stallId) {
  return Stall.findOne({
    where: { id: stallId, owner_id: ownerId, is_deleted: false },
    attributes: ['id'],
  });
}

export async function fetchTelegramOperationsSnapshot(
  ownerId,
  {
    stallId,
    pendingStaleBefore,
    processingStaleBefore,
    latencySince,
  },
  dependencyOverrides = {},
) {
  const dependencies = {
    query: (sql, options) => sequelize.query(sql, {
      ...options,
      type: QueryTypes.SELECT,
    }),
    ...dependencyOverrides,
  };
  const scopedStall = stallPredicate(stallId);
  const replacements = {
    ownerId,
    stallId,
    pendingStaleBefore,
    processingStaleBefore,
    latencySince,
  };

  const statusSql = `
    SELECT
      j.status,
      COUNT(*) AS status_count,
      SUM(CASE
        WHEN j.status = 'pending' AND j.updated_at < :pendingStaleBefore THEN 1
        WHEN j.status = 'processing' AND j.locked_at < :processingStaleBefore THEN 1
        ELSE 0
      END) AS stale_count
    FROM telegram_dispatch_jobs j
    INNER JOIN orders o ON o.id = j.order_id
    INNER JOIN stalls s ON s.id = o.stall_id
    WHERE s.owner_id = :ownerId
      AND s.is_deleted = 0
      ${scopedStall}
      AND (j.status <> 'sent' OR j.updated_at >= :latencySince)
    GROUP BY j.status
  `;

  const actionableSql = `
    SELECT
      j.order_id,
      o.stall_id,
      s.name AS stall_name,
      s.location AS stall_location,
      j.status,
      j.attempt_count,
      j.updated_at AS queued_at,
      j.last_attempt_at,
      j.next_attempt_at,
      j.last_error,
      CASE
        WHEN j.status = 'pending' AND j.updated_at < :pendingStaleBefore THEN 1
        WHEN j.status = 'processing' AND j.locked_at < :processingStaleBefore THEN 1
        ELSE 0
      END AS is_stale
    FROM telegram_dispatch_jobs j
    INNER JOIN orders o ON o.id = j.order_id
    INNER JOIN stalls s ON s.id = o.stall_id
    WHERE s.owner_id = :ownerId
      AND s.is_deleted = 0
      ${scopedStall}
      AND (
        j.status IN ('failed', 'retry')
        OR (j.status = 'pending' AND j.updated_at < :pendingStaleBefore)
        OR (j.status = 'processing' AND j.locked_at < :processingStaleBefore)
      )
    ORDER BY
      CASE
        WHEN j.status = 'failed' THEN 1
        WHEN j.status = 'processing' THEN 2
        WHEN j.status = 'pending' THEN 3
        ELSE 4
      END,
      j.updated_at ASC
    LIMIT ${ACTIONABLE_LIMIT}
  `;

  const latencySql = `
    SELECT
      TIMESTAMPDIFF(MICROSECOND, o.completed_at, MIN(tt.sent_at)) / 1000 AS latency_ms
    FROM telegram_dispatch_jobs j
    INNER JOIN orders o ON o.id = j.order_id
    INNER JOIN stalls s ON s.id = o.stall_id
    INNER JOIN telegram_tickets tt ON tt.order_id = o.id
    WHERE s.owner_id = :ownerId
      AND s.is_deleted = 0
      ${scopedStall}
      AND o.completed_at IS NOT NULL
      AND tt.sent_at IS NOT NULL
      AND tt.sent_at >= :latencySince
      AND tt.sent_at >= o.completed_at
    GROUP BY j.id, o.completed_at
    ORDER BY j.id DESC
    LIMIT ${LATENCY_SAMPLE_LIMIT}
  `;

  const [statusRows, actionableRows, latencyRows] = await Promise.all([
    dependencies.query(statusSql, { replacements }),
    dependencies.query(actionableSql, { replacements }),
    dependencies.query(latencySql, { replacements }),
  ]);

  return { statusRows, actionableRows, latencyRows };
}
