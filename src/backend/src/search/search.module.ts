import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [SearchController],
})
export class SearchModule {}
