import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendNotification,
  createNotification,
  DEFAULT_NOTIFICATION_DURATION_MS,
  MAX_VISIBLE_NOTIFICATIONS,
} from '../src/shared/notifications/notification-policy.js';

test('notifications accept only supported variants and bounded display text', () => {
  const notification = createNotification({
    variant: 'script',
    title: 'T'.repeat(100),
    message: `  ${'M'.repeat(300)}  `,
  }, 'notice-1');

  assert.equal(notification.variant, 'info');
  assert.equal(notification.title.length, 80);
  assert.equal(notification.message.length, 240);
  assert.equal(notification.duration, DEFAULT_NOTIFICATION_DURATION_MS);
});

test('notifications support persistent messages only when duration is explicitly zero', () => {
  assert.equal(createNotification({ message: 'Saved', duration: 0 }, 'notice-1').duration, 0);
  assert.equal(
    createNotification({ message: 'Saved', duration: -1 }, 'notice-2').duration,
    DEFAULT_NOTIFICATION_DURATION_MS,
  );
});

test('the notification viewport keeps only the newest bounded queue', () => {
  let notifications = [];
  for (let index = 1; index <= MAX_VISIBLE_NOTIFICATIONS + 2; index += 1) {
    notifications = appendNotification(
      notifications,
      createNotification(`Message ${index}`, `notice-${index}`),
    );
  }

  assert.equal(notifications.length, MAX_VISIBLE_NOTIFICATIONS);
  assert.deepEqual(
    notifications.map((notification) => notification.id),
    ['notice-3', 'notice-4', 'notice-5'],
  );
});
