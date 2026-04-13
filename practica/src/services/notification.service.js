import { EventEmitter } from 'events';

export const notifier = new EventEmitter();

notifier.on('user:registered', (user) => {
  console.log(`[Event] user:registered - ${user.email} (code: ${user.verificationCode})`);
});

notifier.on('user:verified', (user) => {
  console.log(`[Event] user:verified - ${user.email}`);
});

notifier.on('user:invited', (user) => {
  console.log(`[Event] user:invited - ${user.email} invited to company`);
});

notifier.on('user:deleted', (user) => {
  console.log(`[Event] user:deleted - ${user.email} (soft: ${user.deleted})`);
});
