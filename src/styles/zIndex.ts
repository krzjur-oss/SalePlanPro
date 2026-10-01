/**
 * Global Z-Index scale for SalePlan Pro.
 * Enforces unified layering across the application:
 * - Base content: 0
 * - Sticky headers: 20
 * - Toasts / floating notifications: 60
 * - Dropdowns / popovers / menus: 70
 * - Standard Modals / dialogs: 100
 * - TermsModal / critical legal gates: 110 (strictly above toasts and standard modals)
 * - Processing blocker / heavy background tasks: 200
 * - Critical disaster recovery overlay (isRestoring): 9999 (allowed exception)
 */

export const Z_INDEX = {
  STICKY: 20,
  TOAST: 60,
  DROPDOWN: 70,
  MODAL: 100,
  TERMS_MODAL: 110,
  PROCESSING: 200,
  RESTORING_OVERLAY: 9999,
} as const;

export const Z_INDEX_CLASSES = {
  STICKY: 'z-[20]',
  TOAST: 'z-[60]',
  DROPDOWN: 'z-[70]',
  MODAL: 'z-[100]',
  TERMS_MODAL: 'z-[110]',
  PROCESSING: 'z-[200]',
  RESTORING_OVERLAY: 'z-[9999]',
} as const;
