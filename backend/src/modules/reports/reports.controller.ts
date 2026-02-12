import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  async getDashboardData(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    // Default to current month if not provided
    if (!startDate || !endDate) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      startDate = startDate || start.toISOString();
      endDate = endDate || end.toISOString();
    }

    return this.reportsService.getDashboardData(startDate, endDate);
  }
}
