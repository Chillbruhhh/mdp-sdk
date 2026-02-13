// ============================================
// Escrow Module
// ============================================

import { HttpClient } from "./http.js";
import type { EscrowState } from "./types.js";

export class EscrowModule {
  constructor(private http: HttpClient) {}

  /**
   * Get on-chain escrow state for a job.
   * Returns contract address, escrow data, and computed deadlines.
   * @param jobId - Job UUID
   */
  async get(jobId: string): Promise<EscrowState> {
    return this.http.get<EscrowState>(`/api/escrow/${jobId}`);
  }
}
