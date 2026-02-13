// ============================================
// Disputes Module
// ============================================

import { HttpClient } from "./http.js";
import type { OpenDisputeRequest } from "./types.js";

export class DisputesModule {
  constructor(private http: HttpClient) {}

  /**
   * Open a dispute on a job.
   * Available to job poster or agent owner/executor.
   * @param jobId - Job UUID
   * @param data - Dispute reason and optional tx hash
   */
  async open(jobId: string, data: OpenDisputeRequest): Promise<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `/api/disputes/${jobId}/opened`,
      data
    );
  }
}
