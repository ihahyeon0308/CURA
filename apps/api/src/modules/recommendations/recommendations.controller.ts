import { Controller, Get, Query } from "@nestjs/common";
import type { RecommendationQuery } from "@cura/contracts";
import { RepositoryService } from "../../common/repository.service";

@Controller("api/v1/recommendations")
export class RecommendationsController {
  constructor(private readonly repository: RepositoryService) {}

  @Get()
  getRecommendations(@Query() query: RecommendationQuery) {
    const items = this.repository.getRecommendations(query);

    return {
      items,
      total: items.length,
    };
  }
}
