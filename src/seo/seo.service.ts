import { Injectable, HttpException, HttpStatus} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface AuthCredentials {
  username: string;
  password: string;
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

    private async getTaskResult(endpoint: string, taskId: string): Promise<any> {
        try {
        const response = await firstValueFrom(
            this.httpService.get(`${endpoint}/${taskId}`, { auth: this.auth as AuthCredentials }),
        );

        if (response.status !== HttpStatus.OK) {
            throw new HttpException('Error fetching task result', HttpStatus.BAD_GATEWAY);
        }

        return response.data.tasks[0]?.result;
        } catch (error) {
        console.error('GET task error:', error);
        throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // 1. On-Page instant_pages (canonical, hreflang, schema)
    async getPageSchema(url: string): Promise<any> {
        const endpoint = `${this.baseUrl}on_page/instant_pages`;
        const taskId = await this.postTask(endpoint, [{ target: url }]);
        return this.getTaskResult(endpoint, taskId);
    }

    // 2. On-Page crawl (site graph, crawlability)
    async getSiteAudit(domain: string, maxPages = 50): Promise<any> {
        const endpoint = `${this.baseUrl}on_page/task_post`;
        const payload = [
        {
            target: domain,
            max_crawl_pages: maxPages,
        },
        ];

        const taskId = await this.postTask(endpoint, payload);
        const getEndpoint = `${this.baseUrl}on_page/task_get`;
        return this.getTaskResult(getEndpoint, taskId);
    }

    // 3. Content Analysis (entities, topical flow)
    async getContentAnalysis(url: string): Promise<any> {
        const endpoint = `${this.baseUrl}content_analysis/analyze`;
        const taskId = await this.postTask(endpoint, [{ url }]);
        return this.getTaskResult(endpoint, taskId);
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
        return this.getTaskResult(endpoint, taskId);
    }
}
