import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { RepositoryService } from "../../common/repository.service";

@Controller("api/v1/hospitals")
export class HospitalsController {
  constructor(private readonly repository: RepositoryService) {}

  @Get(":hospitalId")
  async getHospital(@Param("hospitalId") hospitalId: string) {
    const detail = await this.repository.getHospitalDetail(hospitalId);

    if (!detail) {
      throw new NotFoundException("Hospital not found.");
    }

    return detail;
  }

  @Get(":hospitalId/specialties/:specialtySlug")
  async getHospitalSpecialty(@Param("hospitalId") hospitalId: string, @Param("specialtySlug") specialtySlug: string) {
    const detail = await this.repository.getHospitalSpecialtyDetail(hospitalId, specialtySlug);

    if (!detail) {
      throw new NotFoundException("Hospital specialty not found.");
    }

    return detail;
  }

  @Get(":hospitalId/prices")
  async getPriceAnalytics(@Param("hospitalId") hospitalId: string, @Query("treatment") treatment: string) {
    const analytics = await this.repository.getPriceAnalytics(hospitalId, treatment);

    if (!analytics.treatment) {
      throw new NotFoundException("Treatment not found.");
    }

    return analytics;
  }
}
