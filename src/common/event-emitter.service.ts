import { randomUUID } from "crypto";

export function emitEvent(eventType: string, payload: Record<string, any>) {
  const event = {
    eventId: randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    payload
  }

  console.log('[Event Emitted]', JSON.stringify(event, null, 2));

}