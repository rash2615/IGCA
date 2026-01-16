/**
 * Event Bus simple pour synchroniser les données entre les vues
 */
type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(...args));
    }
  }
}

export const eventBus = new EventBus();

// Événements disponibles
export const EVENTS = {
  ADHESION_UPDATED: 'adhesion:updated',
  ADHESION_CREATED: 'adhesion:created',
  ADHESION_DELETED: 'adhesion:deleted',
  DON_UPDATED: 'don:updated',
  DON_CREATED: 'don:created',
  DON_DELETED: 'don:deleted',
  PLAT_UPDATED: 'plat:updated',
  PLAT_CREATED: 'plat:created',
  PLAT_DELETED: 'plat:deleted',
  CARTE_GENERATED: 'carte:generated',
  CARTE_DELETED: 'carte:deleted',
} as const;

