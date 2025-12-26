import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackEntity } from './track.entity';
import { TrackService } from './track.service';
import { TrackController } from './track.controller';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '../shared/shared.module';
import { TrackQueueService } from './track-queue.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrackEntity]),
    ConfigModule,
    SharedModule,
  ],
  providers: [TrackService, TrackQueueService],
  controllers: [TrackController],
  exports: [TrackService],
})
export class TrackModule {}
