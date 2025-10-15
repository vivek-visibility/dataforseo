import { Controller, Get, Post, Body, Query, BadRequestException , Param, HttpException, HttpStatus} from '@nestjs/common';
import { SeoService } from './seo.service';
import { CreateOnPageDto } from './dto/create-on-page.dto';
import { FetchOnPagePagesDto } from './dto/fetch-on-page-pages.dto';

@Controller('seo')
export class SeoController {
  constructor(
    private readonly seoService: SeoService,
  ) {}

  @Get('keywords')
  async getKeywords(@Query('keyword') keyword: string) {
    return this.seoService.fetchKeywordsData(keyword);
  }

  /**
   * GET /seo/analyze?pageUrl=...&domain=...&competitors=...
   */
  @Get('analyze')
  async analyze(
    @Query('pageUrl') pageUrl: string,
    //@Query('competitors') competitors?: string,
  ) {
    console.log(">>>>>>>>>>");
    if (!pageUrl) {
      throw new BadRequestException('Both pageUrl and domain query parameters are required.');
    }

    // const competitorsArr = competitors ? competitors.split(',') : [];
    // console.log("domain",domain);

    //const [schema, audit, contentAnalysis, gap] = await Promise.all([
    const [schema] = await Promise.all([
      this.seoService.getPageSchema(pageUrl),
      //this.seoService.getSiteAudit(domain),
      // this.seoService.getContentAnalysis(pageUrl),
      // competitorsArr.length > 0 ? this.seoService.getEntityGap(domain, competitorsArr) : Promise.resolve(null),
    ]);

    return {
      pageSchema: schema,
      //siteAudit: audit,
      // contentAnalysis: contentAnalysis,
      // entityGap: gap,
    };
  }


  @Get('site-audit')
  async runSiteAudit(@Query('domain') domain: string) {
    if (!domain) {
      throw new BadRequestException('The "domain" query parameter is required.');
    }

    // Step 1: Submit audit request & get taskId and wait time
    const { taskId, estimatedWaitTimeSec, message } = await this.seoService.getSiteAudit(domain);

    return {
      taskId,
      estimatedWaitTimeSec,
      message,
      note: `Call /seo/summary/<${taskId}> after ~${estimatedWaitTimeSec} seconds to get the report.`,
    };
  }

  @Get('site-audit-result')
  async fetchSiteAuditResult(@Query('taskId') taskId: string) {
    if (!taskId) {
      throw new BadRequestException('The "taskId" query parameter is required.');
    }

    const result = await this.seoService.fetchSiteAuditResult(taskId);

    return {
      status: 'success',
      taskId,
      result,
    };
  }

  // @Post('pages')
  // async create(@Body() dto: CreateOnPageDto) {
  //   return this.seoService.createOnPageAudit(dto);
  // }

  @Post('pages')
  async getPages(@Body() dto: FetchOnPagePagesDto) {
    const result = await this.seoService.fetchOnPagePages(dto.tasks);
    return {
      message: 'Fetched OnPage pages successfully',
      data: result,
    };
  }

  @Get('summary/:id')
  async getSummary(@Param('id') id: string) {
    const data = await this.seoService.getSummary(id);
    return {
      message: 'Summary fetched successfully',
      data,
    };
  }

  @Get('tasks_ready')
  async getTasksReady() {
    const data = await this.seoService.getTasksReady();
    return {
      message: 'Tasks ready fetched',
      data,
    };
  }

  @Get('links/:id')
  async getLinks(@Param('id') id: string) {
    try {
      const data = await this.seoService.getLinks(id);
      return {
        message: 'Links fetched successfully',
        data,
      };
    } catch (error: any) {
      // Handle HttpException properly
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed fetching links',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}


