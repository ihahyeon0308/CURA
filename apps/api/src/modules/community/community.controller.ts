import { Controller, Get } from "@nestjs/common";
import { RepositoryService } from "../../common/repository.service";

@Controller("api/v1/posts")
export class CommunityController {
  constructor(private readonly repository: RepositoryService) {}

  @Get()
  getPosts() {
    return {
      items: this.repository.getCommunityPosts(),
    };
  }
}
