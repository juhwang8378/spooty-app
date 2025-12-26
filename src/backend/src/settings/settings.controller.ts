import { Body, Controller, Get, Put } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AppSettings } from './settings.types';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(): AppSettings {
    return this.settingsService.getSettings();
  }

  @Put()
  updateSettings(@Body() update: AppSettings): AppSettings {
    return this.settingsService.updateSettings(update || {});
  }
}
