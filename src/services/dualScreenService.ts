// Dual-Screen Management Service for SalePlan Pro
// Supports Multi-Screen Detection (Window Management API / screen.isExtended)
// and instant two-way synchronization via BroadcastChannel.

export interface ScreenInteractionPayload {
  dayIdx?: number;
  hourIdx?: number;
  classId?: string;
  className?: string;
  subjectId?: string;
  subjectName?: string;
  subjectShort?: string;
  teacherAbbr?: string;
  currentRoomName?: string;
  isDragging?: boolean;
}

export interface DualScreenMessage {
  type: 
    | 'HANDSHAKE'
    | 'HANDSHAKE_ACK'
    | 'STATE_SYNC'
    | 'TAB_CHANGE'
    | 'PLAN_KLAS_HIGHLIGHT'
    | 'ASSIGN_ROOM_CLICK'
    | 'COMPANION_CLOSED'
    | 'CREATE_VARIANT'
    | 'SWITCH_VARIANT'
    | 'UPDATE_LESSONS'
    | 'UPDATE_SCHED_DATA'
    | 'SELECT_LESSON_POOL'
    | 'CLEAR_ROOM_SCHEDULE'
    | 'PING'
    | 'PONG';
  payload?: any;
  timestamp: number;
}

export const DUAL_SCREEN_CHANNEL_NAME = 'saleplan_dual_screen_sync_v1';
export const FORCE_DUAL_SCREEN_KEY = 'saleplan_force_dual_screen';

class DualScreenManager {
  private channel: BroadcastChannel | null = null;
  private companionWindowRef: Window | null = null;
  private listeners: ((msg: DualScreenMessage) => void)[] = [];
  private isMultiScreenDetected: boolean = false;
  private checkInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(DUAL_SCREEN_CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          this.handleIncomingMessage(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel initialization warning:', e);
      }
    }
    this.updateMultiScreenStatus();
    this.setupListeners();
  }

  private setupListeners() {
    if (typeof window === 'undefined') return;

    // Listen to screen change events if supported
    if (window.screen && 'addEventListener' in window.screen) {
      try {
        (window.screen as any).addEventListener('change', () => this.updateMultiScreenStatus());
      } catch (e) {}
    }

    // Window resize / orientation change as heuristic
    window.addEventListener('resize', () => this.updateMultiScreenStatus());

    // Periodic check for screen connection/disconnection
    this.checkInterval = setInterval(() => {
      this.updateMultiScreenStatus();
    }, 4000);
  }

  public updateMultiScreenStatus(): boolean {
    if (typeof window === 'undefined') return false;

    // 1. Hardware detection via screen.isExtended (Chromium 100+)
    let detected = false;
    if (window.screen && 'isExtended' in window.screen) {
      detected = Boolean((window.screen as any).isExtended);
    }

    // 2. Heuristic check: desktop width spanning multiple monitors
    if (!detected && window.screen) {
      if ((window.screen.availWidth && window.screen.availWidth >= 2560) || 
          (window.screen.width && window.screen.width >= 2560)) {
        detected = true;
      }
    }

    // 3. Fallback check for manually forced / simulation mode in settings
    try {
      const forced = localStorage.getItem(FORCE_DUAL_SCREEN_KEY) === 'true';
      if (forced) {
        detected = true;
      }
    } catch (e) {}

    this.isMultiScreenDetected = detected;
    return detected;
  }

  /**
   * Requests native Window Management API permission on Windows 11 / Edge / Chrome.
   * If accepted by user, screen.isExtended becomes true and exact screen positions are unlocked.
   */
  public async requestScreenPermission(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // 1. Try modern getScreenDetails()
    if ('getScreenDetails' in window) {
      try {
        const details = await (window as any).getScreenDetails();
        if (details && details.screens && details.screens.length > 1) {
          this.isMultiScreenDetected = true;
          return true;
        }
      } catch (err) {
        console.warn('Window management permission prompt dismissed or rejected:', err);
      }
    }

    // 2. Try permission query
    if (navigator.permissions && (navigator.permissions as any).query) {
      try {
        const status = await (navigator.permissions as any).query({ name: 'window-management' });
        if (status.state === 'granted') {
          this.updateMultiScreenStatus();
          return this.isMultiScreenDetected;
        }
      } catch (e) {}
    }

    return this.updateMultiScreenStatus();
  }

  public getIsMultiScreenAvailable(): boolean {
    return this.isMultiScreenDetected;
  }

  public isForcedMode(): boolean {
    try {
      return localStorage.getItem(FORCE_DUAL_SCREEN_KEY) === 'true';
    } catch (e) {
      return false;
    }
  }

  public setForcedMode(enabled: boolean) {
    try {
      if (enabled) {
        localStorage.setItem(FORCE_DUAL_SCREEN_KEY, 'true');
      } else {
        localStorage.removeItem(FORCE_DUAL_SCREEN_KEY);
      }
      this.updateMultiScreenStatus();
    } catch (e) {}
  }

  public isCompanionInstance(): boolean {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'companion';
  }

  public isCompanionWindowActive(): boolean {
    return !!this.companionWindowRef && !this.companionWindowRef.closed;
  }

  public async openCompanionWindow(tab: string = 'plan_klas'): Promise<Window | null> {
    if (typeof window === 'undefined') return null;

    let targetLeft = 100;
    let targetTop = 100;
    let targetWidth = 1440;
    let targetHeight = 900;

    // Attempt Window Management API to target second screen
    if ('getScreenDetails' in window) {
      try {
        const screenDetails = await (window as any).getScreenDetails();
        if (screenDetails && screenDetails.screens && screenDetails.screens.length > 1) {
          const secondary = screenDetails.screens.find((s: any) => !s.isPrimary) || screenDetails.screens[1];
          if (secondary) {
            targetLeft = secondary.availLeft ?? 1920;
            targetTop = secondary.availTop ?? 0;
            targetWidth = secondary.availWidth ?? 1920;
            targetHeight = secondary.availHeight ?? 1080;
          }
        }
      } catch (err) {
        // User denied permission or API not available, proceed with standard window features
      }
    }

    const companionUrl = `${window.location.origin}${window.location.pathname}?mode=companion&tab=${encodeURIComponent(tab)}`;
    const windowFeatures = `left=${targetLeft},top=${targetTop},width=${targetWidth},height=${targetHeight},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`;

    if (this.companionWindowRef && !this.companionWindowRef.closed) {
      this.companionWindowRef.focus();
      this.sendMessage({
        type: 'TAB_CHANGE',
        payload: { tab },
        timestamp: Date.now()
      });
      return this.companionWindowRef;
    }

    const win = window.open(companionUrl, 'SalePlan_CompanionWindow', windowFeatures);
    if (win) {
      this.companionWindowRef = win;
      win.focus();
    }
    return win;
  }

  public closeCompanionWindow() {
    if (this.companionWindowRef && !this.companionWindowRef.closed) {
      this.sendMessage({
        type: 'COMPANION_CLOSED',
        timestamp: Date.now()
      });
      this.companionWindowRef.close();
      this.companionWindowRef = null;
    }
  }

  public sendMessage(msg: DualScreenMessage) {
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch (e) {
        console.warn('Failed to send broadcast message:', e);
      }
    }
  }

  public subscribe(callback: (msg: DualScreenMessage) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private handleIncomingMessage(msg: DualScreenMessage) {
    this.listeners.forEach(cb => {
      try {
        cb(msg);
      } catch (e) {
        console.error('Error in dual screen message listener:', e);
      }
    });
  }

  public destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}

export const dualScreenService = new DualScreenManager();
