import { Module } from "@nestjs/common";
import { DatabaseInitService } from "./common/database-init.service";
import { PostgresService } from "./common/postgres.service";
import { RepositoryService } from "./common/repository.service";
import { HealthController } from "./modules/health/health.controller";
import { SearchController } from "./modules/search/search.controller";
import { HospitalsController } from "./modules/hospitals/hospitals.controller";
import { RecommendationsController } from "./modules/recommendations/recommendations.controller";
import { ReviewsController } from "./modules/reviews/reviews.controller";
import { CommunityController } from "./modules/community/community.controller";
import { TreatmentsController } from "./modules/treatments/treatments.controller";

@Module({
  controllers: [
    HealthController,
    SearchController,
    HospitalsController,
    RecommendationsController,
    ReviewsController,
    CommunityController,
    TreatmentsController,
  ],
  providers: [PostgresService, DatabaseInitService, RepositoryService],
})
export class AppModule {}
