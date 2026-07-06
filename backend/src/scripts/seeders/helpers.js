import { faker } from '@faker-js/faker';
import { KHR_RATE } from './data.js';

export function roundUsd(value) {
  return Number(value.toFixed(2));
}

export function toKhr(usd) {
  return Math.round((usd * KHR_RATE) / 100) * 100;
}

export function randomRecentDate() {
  return faker.date.recent({ days: 14 });
}
