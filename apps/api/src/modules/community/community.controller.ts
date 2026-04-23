import { Controller, Get } from "@nestjs/common";
import { RepositoryService } from "../../common/repository.service";

@Controller("api/v1/posts")
export class CommunityController {
  constructor(private readonly repository: RepositoryService) {}

  @Get()
  async getPosts() {
    const items = await this.repository.getCommunityPosts();

    return {
      items,
    };
  }
}
