import { Controller, Get, Query } from "@nestjs/common";
import type { SearchQuery } from "@cura/contracts";
import { RepositoryService } from "../../common/repository.service";

@Controller("api/v1/search")
export class SearchController {
  constructor(private readonly repository: RepositoryService) {}

  @Get()
  async search(@Query() query: SearchQuery) {
    const items = await this.repository.search(query);

    return {
      items,
      total: items.length,
    };
  }
}
