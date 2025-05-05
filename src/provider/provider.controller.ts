import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { ProviderService } from './provider.service';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateProviderDto } from './dto/create-provider.dto';

@Controller('api/providers')
export class ProviderController {
  constructor(private readonly providerService: ProviderService) {}

  @Post()
  async createProvider(@Body() createProviderDto: CreateProviderDto) {
    return this.providerService.createProvider(createProviderDto);
  }

  @Post(':providerId/schedule')
  async updateSchedule(
    @Param('providerId') providerId: string,
    @Body() body: UpdateScheduleDto,
  ) {
    return this.providerService.updateSchedule(providerId, body);
  }

  @Get(':providerId/availability')
  async getAvailability(
    @Param('providerId') providerId: string,
    @Query('date') date: string,
  ) {
    return this.providerService.getAvailability(providerId, date);
  }
}
