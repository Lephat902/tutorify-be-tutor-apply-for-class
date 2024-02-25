import { ApplicationStatus, PaginationDto, SortingDirectionDto, applyMixins, TutorApplyForClassOrderBy } from "@tutorify/shared";

class TutorApplyForClassQueryDto {
    readonly tutorId?: string;
    readonly classId?: string;
    readonly isDesignated?: boolean;
    readonly applicationStatuses?: ApplicationStatus[];
    readonly order?: TutorApplyForClassOrderBy;
}

interface TutorApplyForClassQueryDto extends PaginationDto, SortingDirectionDto { }
applyMixins(TutorApplyForClassQueryDto, [PaginationDto, SortingDirectionDto]);

export { TutorApplyForClassQueryDto };
