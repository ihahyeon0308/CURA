import { Controller, Get, Query } from "@nestjs/common";
import type { RecommendationQuery } from "@cura/contracts";
import { RepositoryService } from "../../common/repository.service";

@Controller("api/v1/recommendations")
export class RecommendationsController {
  constructor(private readonly repository: RepositoryService) {}

  @Get()
  async getRecommendations(@Query() query: RecommendationQuery) {
    const items = await this.repository.getRecommendations(query);

    return {
      items,
      total: items.length,
    };
  }
}
