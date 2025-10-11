import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { SeoService } from './seo.service';

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
    @Query('domain') domain: string,
    @Query('competitors') competitors?: string,
  ) {
    if (!pageUrl || !domain) {
      throw new BadRequestException('Both pageUrl and domain query parameters are required.');
    }

    const competitorsArr = competitors ? competitors.split(',') : [];

    const [schema, audit, contentAnalysis, gap] = await Promise.all([
      this.seoService.getPageSchema(pageUrl),
      this.seoService.getSiteAudit(domain),
      this.seoService.getContentAnalysis(pageUrl),
      competitorsArr.length > 0 ? this.seoService.getEntityGap(domain, competitorsArr) : Promise.resolve(null),
    ]);

    return {
      pageSchema: schema,
      siteAudit: audit,
      contentAnalysis: contentAnalysis,
      entityGap: gap,
    };
  }
}


