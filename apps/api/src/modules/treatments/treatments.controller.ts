import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { RepositoryService } from "../../common/repository.service";

@Controller("api/v1/treatments")
export class TreatmentsController {
  constructor(private readonly repository: RepositoryService) {}

  @Get(":slug")
  async getTreatment(@Param("slug") slug: string) {
    const detail = await this.repository.getTreatmentDetail(slug);

    if (!detail) {
      throw new NotFoundException("Treatment not found.");
    }

    return detail;
  }
}
