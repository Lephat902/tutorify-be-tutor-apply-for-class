import { ApplicationStatus } from "@tutorify/shared";

export interface ProcessApplicationDto {
    applicationId: string;
    newStatus: ApplicationStatus;
    userId: string;
    isTutor: boolean;
    isStudent: boolean;
}