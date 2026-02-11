// ============================================
// Jobs Module
// ============================================

import { HttpClient } from "./http.js";
import {
  Job,
  CreateJobRequest,
  UpdateJobRequest,
  ListJobsParams,
} from "./types.js";

export class JobsModule {
  constructor(private http: HttpClient) {}

  private coerceList(response: any): Job[] {
    if (response?.items && Array.isArray(response.items)) return response.items;
    if (response?.jobs && Array.isArray(response.jobs)) return response.jobs;
    return [];
  }

  private coerceItem(response: any): Job {
    if (response?.item) return response.item;
    if (response?.job) return response.job;
    return response as Job;
  }

  /**
   * List available jobs with optional filtering
   * @param params - Query parameters for filtering
   */
  async list(params?: ListJobsParams): Promise<Job[]> {
    const response = await this.http.get<any>("/api/jobs", {
      status: params?.status,
      limit: params?.limit,
      offset: params?.offset,
    });
    return this.coerceList(response);
  }

  /**
   * Get a specific job by ID
   * @param id - Job UUID
   */
  async get(id: string): Promise<Job> {
    const response = await this.http.get<any>(`/api/jobs/${id}`);
    return this.coerceItem(response);
  }

  /**
   * Create a new job posting
   * Requires authentication
   * @param data - Job creation data
   */
  async create(data: CreateJobRequest): Promise<Job> {
    const response = await this.http.post<any>("/api/jobs", data);
    return this.coerceItem(response);
  }

  /**
   * Update an existing job
   * Requires authentication and ownership
   * @param id - Job UUID
   * @param data - Fields to update
   */
  async update(id: string, data: UpdateJobRequest): Promise<Job> {
    const response = await this.http.patch<any>(`/api/jobs/${id}`, data);
    return this.coerceItem(response);
  }

  /**
   * List open jobs (convenience method)
   */
  async listOpen(params?: Omit<ListJobsParams, "status">): Promise<Job[]> {
    return this.list({ ...params, status: "open" });
  }

  /**
   * List jobs in progress (convenience method)
   */
  async listInProgress(params?: Omit<ListJobsParams, "status">): Promise<Job[]> {
    return this.list({ ...params, status: "in_progress" });
  }

  /**
   * Search jobs by skills (client-side filtering)
   * @param skills - Required skills to match
   * @param params - Additional query parameters
   */
  async findBySkills(skills: string[], params?: ListJobsParams): Promise<Job[]> {
    const jobs = await this.list(params);
    const lowerSkills = skills.map(s => s.toLowerCase());
    
    return jobs.filter(job => 
      job.requiredSkills.some(skill => 
        lowerSkills.includes(skill.toLowerCase())
      )
    );
  }

  /**
   * Search jobs by budget range (client-side filtering)
   * @param minBudget - Minimum budget in USDC
   * @param maxBudget - Maximum budget in USDC
   * @param params - Additional query parameters
   */
  async findByBudgetRange(
    minBudget: number,
    maxBudget: number,
    params?: ListJobsParams
  ): Promise<Job[]> {
    const jobs = await this.list(params);
    return jobs.filter(job => 
      job.budgetUSDC >= minBudget && job.budgetUSDC <= maxBudget
    );
  }
}
