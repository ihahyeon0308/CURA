import { Injectable } from "@nestjs/common";
import { SeedRepository } from "@cura/domain";

@Injectable()
export class RepositoryService extends SeedRepository {}
