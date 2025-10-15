import { Injectable, HttpException, HttpStatus} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { exit } from 'process';
import axios, { AxiosError, isAxiosError } from 'axios';
import { CreateOnPageDto } from './dto/create-on-page.dto';
import { OnPageBenchmarkSchema } from './schemas/on-page-benchmark.schema';

interface AuthCredentials {
  username: string;
  password: string;
}
interface ApiErrorResponse {
  status_message?: string;
  [key: string]: any;
}
@Injectable()
export class SeoService {

    private readonly baseUrl = 'https://api.dataforseo.com/v3/';
    private readonly auth = {
        username: process.env.DATAFORSEO_USERNAME,
        password: process.env.DATAFORSEO_PASSWORD,
    };

    constructor(private readonly httpService: HttpService) {}

    async fetchKeywordsData(keyword: string): Promise<any> {
        try {
            const url = `${this.baseUrl}keywords_data`;
            console.log("keyword",keyword);
            // Check if auth credentials are defined
            if (!this.auth.username || !this.auth.password) {
            throw new Error('Authentication credentials are missing.');
            }

            // Use the correct type for the auth object
            const response = await this.httpService
            .post(url, { keyword }, { auth: this.auth as AuthCredentials })
            .toPromise();

            // Safely check for the response and status
            if (!response?.status || response.status !== HttpStatus.OK) {
            throw new HttpException('Error from DataForSEO API', HttpStatus.BAD_GATEWAY);
            }

            return response.data;
        } catch (error) {
            console.error('Error fetching data from DataForSEO API:', error);
            throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private async postTask(endpoint: string, payload: any): Promise<string> {
        if (!this.auth.username || !this.auth.password) {
        throw new Error('Authentication credentials are missing.');
        }

        try {
        const response = await firstValueFrom(
            this.httpService.post(endpoint, payload, { auth: this.auth as AuthCredentials }),
        );

        if (response.status !== HttpStatus.OK || !response.data?.tasks?.length) {
            throw new HttpException(
            `Error creating task at ${endpoint}`,
            HttpStatus.BAD_GATEWAY,
            );
        }

        return response.data.tasks[0].id;
        } catch (error) {
        console.error('POST task error:', error);
        throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private async getTaskResult(getEndpoint: string, taskId: string): Promise<any> {
        if (!this.auth.username || !this.auth.password) {
            throw new Error('Authentication credentials are missing.');
        }

        try {
            const response = await firstValueFrom(
            this.httpService.post(getEndpoint, [{ id: taskId }], {
                auth: this.auth as AuthCredentials,
                headers: { 'Content-Type': 'application/json' },
            })
            );

            if (response.status !== HttpStatus.OK || !response.data?.tasks?.length) {
            console.error('getTaskResult invalid response:', response.data);
            throw new HttpException(
                `Task not found or invalid response at ${getEndpoint}`,
                HttpStatus.BAD_GATEWAY
            );
            }

            const task = response.data.tasks[0];

            if (task.status_code !== 20000 || !task.result?.length) {
            console.error('getTaskResult failed task:', task);
            throw new HttpException('Task failed or empty', HttpStatus.BAD_GATEWAY);
            }

            return task.result;
        } catch (error) {
            console.error('GET task error:', error?.response?.data || error.message);
            throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }




    // 1. On-Page instant_pages (canonical, hreflang, schema)
    // async getPageSchema(url: string): Promise<any> {
    //     const postEndpoint = `${this.baseUrl}on_page/instant_pages`;
    //     const getEndpoint = `${this.baseUrl}on_page/instant_pages/task_get/json`;

    //     const taskId = await this.postTask(postEndpoint, [{ target: url }]);
    //     console.log("Posted task ID:", taskId);
    //     console.log("Waiting for 60 sec");
    //     // Wait for a few seconds (DataForSEO is async for some endpoints)
    //     await new Promise(resolve => setTimeout(resolve, 60000));

    //     console.log("Calling Task Id");

    //     const result = await this.getTaskResult(getEndpoint, taskId);
    //     console.log("Task result:", result);
    //     return result;
    // }
    async getPageSchema(url: string): Promise<any> {
        if (!this.auth.username || !this.auth.password) {
            throw new Error('Authentication credentials are missing.');
        }

        const endpoint = `${this.baseUrl}on_page/instant_pages`;

        const response = await firstValueFrom(
            this.httpService.post(
            endpoint,
            [
                {
                url: url,
                // optional flags:
                // enable_javascript: true,
                // custom_js: "...",
                },
            ],
            {
                auth: this.auth as AuthCredentials,
                headers: { 'Content-Type': 'application/json' },
            }
            )
        );

        // Validate response
        if (response.status !== HttpStatus.OK || !response.data?.tasks?.length) {
            console.error('instant_pages response invalid:', response.data);
            throw new HttpException('Error fetching instant pages data', HttpStatus.BAD_GATEWAY);
        }

        const task = response.data.tasks[0];

        if (task.status_code !== 20000) {
            console.error('instant_pages task status failure:', task);
            throw new HttpException(
            `Task failed with status ${task.status_message}`,
            HttpStatus.BAD_GATEWAY
            );
        }
        // console.log(task);
        // result is available immediately
        return task.result;
    }


    // 2. Site Audit – uses task_post + task_get
    async getSiteAudit(domain: string, maxPages = 50): Promise<{
        taskId: string;
        estimatedWaitTimeSec: number;
        message: string;
    }> {
        const endpoint = `${this.baseUrl}on_page/task_post`;
        const payload = [
            {
            target: domain,
            max_crawl_pages: maxPages,
            // Optional: postback_url if you want to get it pushed later
            // postback_url: 'https://your-server.com/api/postback/on-page',
            },
        ];

        try {
            const response = await firstValueFrom(
                this.httpService.post(endpoint, payload, {
                    auth: this.auth as AuthCredentials,
                }),
            );

            const task = response?.data?.tasks?.[0];
            if (!task || !task.id) {
                throw new Error('Invalid response or task not created');
            }

            const estimatedWaitTimeSec = task.execution_time; // fallback to 60 sec if not present

            return {
                taskId: task.id,
                estimatedWaitTimeSec,
                message: `Task submitted. Please wait ~${estimatedWaitTimeSec} seconds before fetching results.`,
            };
        } catch (error) {
            console.error('Error submitting site audit task:', error);
            throw new HttpException('Site Audit task submission failed', HttpStatus.BAD_GATEWAY);
        }
    }

    async fetchSiteAuditResult(taskId: string): Promise<any> {
    const endpoint = `${this.baseUrl}serp/google/finance_ticker_search/task_get/advanced/${taskId}`;

    if (!this.auth.username || !this.auth.password) {
        throw new Error('Authentication credentials are missing.');
    }

    try {
        const response = await firstValueFrom(
        this.httpService.get(endpoint, {
            auth: this.auth as AuthCredentials,
            headers: { 'Content-Type': 'application/json' },
        })
        );

        if (response.status !== HttpStatus.OK || !response.data?.tasks?.length) {
        console.error('fetchSiteAuditResult invalid response:', response.data);
        throw new HttpException(
            `Task not found or invalid response at ${endpoint}`,
            HttpStatus.NOT_FOUND
        );
        }

        const task = response.data.tasks[0];

        // Task ID not found or expired
        if (task.status_code === 40400 || task.status_message === 'Not Found.') {
        throw new HttpException(
            'Task ID not found. It might be incorrect or expired.',
            HttpStatus.NOT_FOUND
        );
        }

        // Task is still processing
        if (!task.result) {
        throw new HttpException(
            'Task is still processing. Please try again later.',
            HttpStatus.ACCEPTED // 202
        );
        }

        // Check if task failed for any other reason
        if (task.status_code !== 20000) {
        console.error('fetchSiteAuditResult failed task:', task);
        throw new HttpException(
            `Task failed with status code ${task.status_code}: ${task.status_message}`,
            HttpStatus.BAD_GATEWAY
        );
        }

        return task.result;
    } catch (error: any) {
        // Axios error
        if (error.isAxiosError) {
        const axiosError = error as AxiosError;

        const status = axiosError.response?.status || 500;
        const data = axiosError.response?.data as ApiErrorResponse;
        const message = data?.status_message || axiosError.message || 'API error occurred.';

        console.error('DataForSEO API error:', message);

        throw new HttpException(`DataForSEO API error: ${message}`, status);
        }

        // Other errors
        console.error('Unknown error fetching site audit result:', error?.message || error);
        throw new HttpException(
        error?.message || 'Unknown server error while fetching site audit result.',
        HttpStatus.INTERNAL_SERVER_ERROR
        );
    }
    }


    // 3. Content Analysis (entities, topical flow)
    async getContentAnalysis(url: string): Promise<any> {
        const endpoint = `${this.baseUrl}content_analysis/analyze`;
        const payload = [{ url }];
        const taskId = await this.postTask(endpoint, payload);

        const getEndpoint = `${this.baseUrl}content_analysis/analyze`;
        return this.getTaskResult(getEndpoint, taskId);
    }

    // 4. Competitor / Entity Gap Analysis
    async getEntityGap(target: string, competitors: string[]): Promise<any> {
        const endpoint = `${this.baseUrl}content_analysis/competitors`;
        const payload = [
            {
            target,
            targets_compare: competitors,
            },
        ];

        const taskId = await this.postTask(endpoint, payload);
        const getEndpoint = `${this.baseUrl}content_analysis/competitors`;
        return this.getTaskResult(getEndpoint, taskId);
    }


    private getMetricScore(value: any, rule: any): number {
        if (rule.expected !== undefined) {
            return value === rule.expected ? 100 : 0;
        }

        if (rule.healthy_min !== undefined && rule.healthy_max !== undefined) {
            if (value >= rule.healthy_min && value <= rule.healthy_max) return 100;
            if (value < rule.healthy_min * 0.7 || value > rule.healthy_max * 1.3) return 0;
            return 50;
        }

        return 0;
    }

    calculateOnPageScore(metrics: CreateOnPageDto) {
        const schema = OnPageBenchmarkSchema;
        let totalWeight = 0;
        let weightedScore = 0;
        const metricDetails = {};

        for (const [key, rule] of Object.entries(schema.metrics)) {
        const value = metrics[key];
        const score = this.getMetricScore(value, rule);
        const weight = schema.weights[rule.weight] || 0.1;

        totalWeight += weight;
        weightedScore += (score / 100) * weight;

        metricDetails[key] = {
            label: rule.label,
            value,
            score,
            weight: rule.weight,
        };
        }

        const finalScore = (weightedScore / totalWeight) * 100;
        const status =
        finalScore >= 80
            ? 'Healthy'
            : finalScore >= 60
            ? 'Needs Improvement'
            : 'Critical';

        return {
        url: metrics.url,
        score: parseFloat(finalScore.toFixed(2)),
        status,
        metrics: metricDetails,
        };
    }

    async createOnPageAudit(dto: CreateOnPageDto) {
        // You could also save to DB here (Mongo/Postgres)
        const result = this.calculateOnPageScore(dto);
        return { message: 'On-page audit scored successfully', result };
    }

    private getAuthHeaders() {
        // depending on how DataForSEO authenticates — basic auth or header token
        const username = process.env.DATAFORSEO_USERNAME;
        const password = process.env.DATAFORSEO_PASSWORD;
        const token = Buffer.from(`${username}:${password}`).toString('base64');
        return {
            Authorization: `Basic ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
    }

    /**
     * Call DataForSEO API: POST /v3/on_page/pages
     * @param tasks array of task request objects (filters, id, limit, etc)
     */
    async fetchOnPagePages(tasks: any[]): Promise<any> {
        const url = `https://api.dataforseo.com/v3/on_page/pages`;
        const headers = this.getAuthHeaders();

        try {
        const response$ = this.httpService.post(url, tasks, { headers });
        const response = await firstValueFrom(response$);

        if (response.status !== 200) {
            throw new HttpException(
            `DataForSEO API responded with HTTP ${response.status}`,
            HttpStatus.BAD_GATEWAY,
            );
        }

        const data = response.data;

        // Basic error checking (DataForSEO often returns status_code inside JSON)
        if (data.status_code && data.status_code !== 20000) {
            throw new HttpException(
            `DataForSEO API error: ${data.status_message || 'Unknown error'}`,
            HttpStatus.BAD_GATEWAY,
            );
        }

        return data;
        } catch (err) {
        // wrap or rethrow
        if (err instanceof HttpException) {
            throw err;
        }
        throw new HttpException(
            `Failed to fetch OnPage pages: ${err.message}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
        }
    }

    async getSummary(taskId: string): Promise<any> {
        const url = `${this.baseUrl}on_page/summary/${taskId}`;
        const username = process.env.DATAFORSEO_USERNAME;
        const password = process.env.DATAFORSEO_PASSWORD;


        // Check if username and password are defined, else throw an error
        if (!username || !password) {
            throw new Error('Username or password is undefined');
        }

        try {
            const response = await axios({
                method: 'get',
                url: url,
                auth: {
                    username: username,
                    password: password
                },
                headers: {
                    'content-type': 'application/json'
                }
            });

            // Extract result from the response data
            const result = response['data']['tasks'];
            // Return the result to the caller
            return result;
        } catch (error) {
            console.error('Error fetching tasks:', error);
            throw new Error('Failed to fetch tasks');
        }

    }

    /**
     * Get list of ready tasks (DataForSEO OnPage API)
     */
    async getTasksReady(): Promise<any> {
        const url = `${this.baseUrl}on_page/tasks_ready`;
        const username = process.env.DATAFORSEO_USERNAME;
        const password = process.env.DATAFORSEO_PASSWORD;


        // Check if username and password are defined, else throw an error
        if (!username || !password) {
            throw new Error('Username or password is undefined');
        }

        try {
            const response = await axios({
                method: 'get',
                url: url,
                auth: {
                    username: username,
                    password: password
                },
                headers: {
                    'content-type': 'application/json'
                }
            });

            // Extract result from the response data
            const result = response.data.tasks[0].result;
            // Return the result to the caller
            return result;
        } catch (error) {
            console.error('Error fetching tasks:', error);
            throw new Error('Failed to fetch tasks');
        }

    } 

  async getLinks(taskId: string): Promise<any> {
    const url = `${this.baseUrl}on_page/links`;
    const username = process.env.DATAFORSEO_USERNAME;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!username || !password) {
      throw new HttpException(
        'API credentials are missing.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    type LinkTask = {
      id: string;
      page_from: string;
      filters: (string | (string | boolean)[])[];
      limit: number;
    };

    const data: LinkTask[] = [
      {
        id: taskId,
        page_from: '/apis/google-trends-api',
        filters: [
          ['dofollow', '=', true],
          'and',
          ['direction', '=', 'external']
        ],
        limit: 10,
      }
    ];

    try {
      const response = await axios.post(url, data, {
        auth: { username, password },
        headers: { 'Content-Type': 'application/json' },
      });

      const result = response.data;

      if (result.status_code && result.status_code !== 20000) {
        throw new HttpException(
          `DataForSEO API error: ${result.status_message}`,
          HttpStatus.BAD_GATEWAY,
        );
      }
      return result;
    } catch (err: any) {
      console.error('Error fetching tasks:', err.response?.data || err.message);

      throw new HttpException(
        err.response?.data?.status_message || err.message || 'Failed fetching tasks',
        err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
