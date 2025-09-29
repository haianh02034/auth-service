import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsService } from './sessions.service';
import { UserSession } from './entities/session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserSession])],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
