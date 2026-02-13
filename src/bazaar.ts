// ============================================
// Bazaar Module (x402-gated)
// ============================================

import { HttpClient } from "./http.js";
import type { BazaarSearchParams, BazaarSearchResponse } from "./types.js";

export class BazaarModule {
  constructor(private http: HttpClient) {}

  /**
   * Search open jobs via the x402-gated bazaar endpoint.
   * @param params - Optional search query and limit (1-25)
   */
  async searchJobs(params?: BazaarSearchParams): Promise<BazaarSearchResponse> {
    return this.http.get<BazaarSearchResponse>("/api/bazaar/jobs/search", {
      q: params?.q,
      limit: params?.limit,
    });
  }
}
