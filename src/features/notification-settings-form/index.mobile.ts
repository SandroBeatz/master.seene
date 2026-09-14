// Mobile public API: expose only the framework-agnostic form state mapper so
// the Ionic bundle never resolves the desktop Nuxt UI component.
export { useNotificationSettings } from './model/use-notification-settings'
export type { NotificationSettingsState } from './model/use-notification-settings'
