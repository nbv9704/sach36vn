import { supabase } from './supabase';

export class CSGOEmpireMatchBettingClient {
  constructor(options = {}) {
    this.functionName = options.functionName || 'matchbetting';
    this.functionUrl = options.functionUrl || import.meta.env.VITE_MATCHBETTING_FUNCTION_URL || '';
  }

  async invokeFunction(payload) {
    if (this.functionUrl) {
      const response = await fetch(this.functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || `Matchbetting function failed with ${response.status}`);
      }

      return data;
    }

    const { data, error } = await supabase.functions.invoke(this.functionName, {
      body: payload,
    });

    if (error || data?.success === false) {
      throw new Error(data?.error || error?.message || 'Matchbetting function failed');
    }

    return data;
  }

  async getSnapshot(type = 'live', options = {}) {
    return this.invokeFunction({
      type,
      category: options.category || '',
    });
  }

  async getEventDetails(eventId, type) {
    return this.invokeFunction({
      eventId,
      type,
    });
  }
}
