import { IntersectionType } from "@nestjs/mapped-types";
import { ApplicationStatus, PaginationDto, SortingDirectionDto, TutorApplyForClassOrderBy } from "@tutorify/shared";

export class TutorApplyForClassQueryDto extends IntersectionType(
    PaginationDto,
    SortingDirectionDto,
) {
    readonly tutorId: string;
    readonly classId: string;
    readonly isDesignated: boolean;
    readonly applicationStatuses: ApplicationStatus[];
    readonly order: TutorApplyForClassOrderBy;
    readonly includeDeletedClass: boolean;
}