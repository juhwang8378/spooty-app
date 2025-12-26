import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackEntity } from './track/track.entity';
import { TrackModule } from './track/track.module';
import { PlaylistModule } from './playlist/playlist.module';
import { PlaylistEntity } from './playlist/playlist.entity';
import { EnvironmentEnum } from './environmentEnum';
import { resolveFromBase } from './shared/path-resolver';
import { SettingsModule } from './settings/settings.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const baseDir = process.env.SPOOTY_BASE_DIR || __dirname;
        return {
        type: 'sqlite',
        database: resolveFromBase(
          configService.get<string>(EnvironmentEnum.DB_PATH),
          baseDir,
        ),
        entities: [TrackEntity, PlaylistEntity],
        synchronize: true,
        };
      },
      inject: [ConfigService],
    }),
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const baseDir = process.env.SPOOTY_BASE_DIR || __dirname;
        return [
          {
            rootPath: resolveFromBase(
              configService.get<string>(EnvironmentEnum.FE_PATH),
              baseDir,
            ),
            exclude: ['/api/(.*)'],
          },
        ];
      },
      inject: [ConfigService],
    }),
    TrackModule,
    PlaylistModule,
    SettingsModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
