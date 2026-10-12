// Notification, digest and learning-preference events (catalog rows live in
// docs/ANALYTICS.md → "Shared event catalog"). Every helper goes through the
// consent-gated shared sender, and callers fire them only from
// server-confirmed success paths. No notification title/description, digest
// item copy or learning-preference values are ever sent.

import type {
  NotificationKind,
  NotificationPreferencesResponse,
} from '@shared/notifications';
import { track } from './analytics';

type PreferenceSetting =
  | 'email_digest'
  | 'in_app'
  | 'include_new_resources'
  | 'include_watch_next'
  | 'include_journey_step'
  | 'cadence'
  | 'timezone';

/** The fields both the saved form state and the server response carry. */
type PreferenceSnapshot = Pick<
  NotificationPreferencesResponse,
  | 'emailDigestEnabled'
  | 'inAppEnabled'
  | 'includeNewResources'
  | 'includeWatchNext'
  | 'includeJourneyStep'
  | 'cadence'
> & { timezone: string | null };

const BOOLEAN_SETTINGS = [
  ['emailDigestEnabled', 'email_digest'],
  ['inAppEnabled', 'in_app'],
  ['includeNewResources', 'include_new_resources'],
  ['includeWatchNext', 'include_watch_next'],
  ['includeJourneyStep', 'include_journey_step'],
] as const satisfies readonly (readonly [keyof PreferenceSnapshot, PreferenceSetting])[];

/**
 * One `notification_preference_changed` per setting that differs between the
 * last server-confirmed preferences as the form showed them (an unsaved
 * timezone displays as the browser's zone) and the saved response. Booleans send
 * `value: 'on' | 'off'`, cadence its enum; timezone sends no value (it is
 * location-adjacent). `pausedUntil` is excluded — pause/resume have their own
 * events.
 */
export const trackNotificationPreferenceChanges = (
  previous: PreferenceSnapshot | null | undefined,
  saved: PreferenceSnapshot,
) => {
  for (const [field, setting] of BOOLEAN_SETTINGS) {
    if (previous?.[field] === saved[field]) continue;
    track('notification_preference_changed', {
      setting,
      value: saved[field] ? 'on' : 'off',
    });
  }
  if (previous?.cadence !== saved.cadence) {
    track('notification_preference_changed', { setting: 'cadence', value: saved.cadence });
  }
  if (previous && previous.timezone !== saved.timezone) {
    track('notification_preference_changed', { setting: 'timezone' });
  }
};

export const trackNotificationsPaused = (pauseDays: number) => {
  track('notifications_paused', { pause_days: pauseDays });
};

export const trackNotificationsResumed = () => {
  track('notifications_resumed');
};

/** Which channels the unsubscribe actually turned off (server-confirmed before/after). */
export const trackNotificationsUnsubscribedAll = (turnedOff: {
  emailDigest: boolean;
  inApp: boolean;
}) => {
  track('notifications_unsubscribed_all', {
    // Not `email_*`: the shared sanitizer drops email-named keys.
    digest_turned_off: turnedOff.emailDigest,
    in_app_turned_off: turnedOff.inApp,
  });
};

/** Inbox notification link followed. Kind + id only — never its text. */
export const trackNotificationOpened = (notification: {
  id: number | string;
  kind: string;
  unread: boolean;
}) => {
  track('notification_opened', {
    notification_id: String(notification.id),
    notification_kind: notification.kind,
    was_unread: notification.unread,
  });
};

/** One notification server-confirmed read, either by opening it or by its Mark read button. */
export const trackNotificationMarkedRead = (notification: {
  id: number | string;
  kind: string;
  readVia: 'opened' | 'button';
}) => {
  track('notification_marked_read', {
    notification_id: String(notification.id),
    notification_kind: notification.kind,
    read_via: notification.readVia,
  });
};

export const trackNotificationsMarkedAllRead = (markedCount: number) => {
  track('notifications_marked_all_read', { marked_count: markedCount });
};

/** Digest preview item in the Settings preferences card followed. */
export const trackDigestPreviewItemOpened = (item: {
  kind: NotificationKind;
  sectionKey: string;
  position: number;
}) => {
  track('digest_preview_item_opened', {
    notification_kind: item.kind,
    digest_section: item.sectionKey,
    item_position: item.position,
  });
};

/** Learning preferences saved from Settings (values are never sent). */
export const trackLearningPreferencesSaved = (firstSave: boolean) => {
  track('learning_preferences_saved', { surface: 'settings', first_save: firstSave });
};

export const trackLearningPreferencesReset = () => {
  track('learning_preferences_reset', { surface: 'settings' });
};
