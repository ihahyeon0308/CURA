import { Body, Controller, Post } from "@nestjs/common";
import type { CreateReviewInput } from "@cura/contracts";
import { RepositoryService } from "../../common/repository.service";

@Controller("api/v1/reviews")
export class ReviewsController {
  constructor(private readonly repository: RepositoryService) {}

  @Post()
  createReview(@Body() input: CreateReviewInput) {
    return this.repository.createReview(input);
  }
}
