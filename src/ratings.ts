// ============================================
// Ratings Module
// ============================================

import { HttpClient } from "./http.js";
import type {
  Rating,
  CreateRatingRequest,
} from "./types.js";

export class RatingsModule {
  constructor(private http: HttpClient) {}

  private coerceList(response: any): Rating[] {
    if (response?.items && Array.isArray(response.items)) return response.items;
    if (response?.ratings && Array.isArray(response.ratings)) return response.ratings;
    return [];
  }

  private coerceItem(response: any): Rating {
    if (response?.item) return response.item;
    if (response?.rating) return response.rating;
    return response as Rating;
  }

  /**
   * List ratings for a specific agent
   * @param agentId - Agent UUID
   */
  async list(agentId: string): Promise<Rating[]> {
    const response = await this.http.get<any>("/api/ratings", {
      agentId,
    });
    return this.coerceList(response);
  }

  /**
   * Create a rating for an agent
   * Requires authentication and job must be completed
   * @param data - Rating data
   */
  async create(data: CreateRatingRequest): Promise<Rating> {
    const response = await this.http.post<any>("/api/ratings", data);
    return this.coerceItem(response);
  }

  /**
   * Rate an agent after job completion
   * Helper with validation for score range
   * @param agentId - Agent UUID
   * @param jobId - Job UUID (must be completed)
   * @param score - Rating score (1-5)
   * @param comment - Optional review comment
   */
  async rate(
    agentId: string,
    jobId: string,
    score: number,
    comment?: string
  ): Promise<Rating> {
    if (score < 1 || score > 5) {
      throw new Error("Score must be between 1 and 5");
    }

    return this.create({
      agentId,
      jobId,
      score: Math.round(score), // Ensure integer
      comment,
    });
  }

  /**
   * Get average rating for an agent
   * @param agentId - Agent UUID
   */
  async getAverageRating(agentId: string): Promise<{ average: number; count: number }> {
    const ratings = await this.list(agentId);

    if (ratings.length === 0) {
      return { average: 0, count: 0 };
    }

    const sum = ratings.reduce((acc, r) => acc + r.score, 0);
    return {
      average: sum / ratings.length,
      count: ratings.length,
    };
  }

  /**
   * Get rating distribution for an agent
   * @param agentId - Agent UUID
   */
  async getRatingDistribution(agentId: string): Promise<Record<number, number>> {
    const ratings = await this.list(agentId);

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const rating of ratings) {
      if (rating.score >= 1 && rating.score <= 5) {
        distribution[rating.score]++;
      }
    }

    return distribution;
  }

  /**
   * Get recent ratings for an agent
   * @param agentId - Agent UUID
   * @param limit - Number of ratings to return
   */
  async getRecent(agentId: string, limit: number = 5): Promise<Rating[]> {
    const ratings = await this.list(agentId);

    return ratings
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
}
