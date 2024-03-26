import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { TutorApplyForClass } from './tutor-apply-for-class.entity';
import { ApplicationStatus, QueueNames } from '@tutorify/shared';
import { TutorApplyForClassRepository } from './tutor-apply-for-class.repository';
import { Class, ProcessApplicationDto, TutorApplyForClassCreateDto, TutorApplyForClassQueryDto } from './dtos';
import { ClassApplicationEventDispatcher } from './class-application.event-dispatcher';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

const MAX_NUM_OF_TUTORS_TO_DESIGNATE_ALLOWED = 5;

@Injectable()
export class TutorApplyForClassService {
  constructor(
    private readonly tutorApplyForClassRepository: TutorApplyForClassRepository,
    private readonly classApplicationEventDispatcher: ClassApplicationEventDispatcher,
    @Inject(QueueNames.CLASS_AND_CATEGORY) private readonly client: ClientProxy,
  ) { }

  async addNewApplication(tutorApplyForClassCreateDto: TutorApplyForClassCreateDto): Promise<TutorApplyForClass> {
    const { tutorId, classId } = tutorApplyForClassCreateDto;
    await this.checkExistingApprovedApplication(classId);
    await this.checkReApplyWhilePending(tutorId, classId);
    const newClassApplication = await this.tutorApplyForClassRepository.save(tutorApplyForClassCreateDto);
    this.classApplicationEventDispatcher.dispatchClassApplicationCreatedEvent(newClassApplication);
    return newClassApplication;
  }

  async designateTutors(classId: string, tutorIds: string[]): Promise<TutorApplyForClass[]> {
    const tutorIdsToDesignate = tutorIds.slice(0, MAX_NUM_OF_TUTORS_TO_DESIGNATE_ALLOWED);
    const tutorApplications = tutorIdsToDesignate.map(tutorId => {
      return this.tutorApplyForClassRepository.create({
        classId,
        tutorId,
        isDesignated: true,
      });
    });

    const newClassApplications = await this.tutorApplyForClassRepository.save(tutorApplications);
    newClassApplications.map(newClassApplication => {
      this.classApplicationEventDispatcher.dispatchClassApplicationCreatedEvent(newClassApplication);
    });

    return newClassApplications;
  }

  async getApplicationById(id: string): Promise<TutorApplyForClass> {
    const application = await this.tutorApplyForClassRepository.findOneBy({ id });
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async getAllApplications(filters: TutorApplyForClassQueryDto): Promise<TutorApplyForClass[]> {
    return this.tutorApplyForClassRepository.getAllApplications(filters);
  }

  async processApplication(processApplicationDto: ProcessApplicationDto) {
    const { userId, isStudent, isTutor, applicationId, newStatus } = processApplicationDto;
    const application = await this.getApplicationById(applicationId);
    // Authorization check
    if (isTutor) {
      this.checkApplicationProcessPermissionForTutor(application, userId, newStatus);
    } else if (isStudent) {
      await this.checkApplicationProcessPermissionForStudent(application, userId, newStatus);
    } else {
      throw new ForbiddenException("How the hell you get here?");
    }

    return this.updateStatus(applicationId, newStatus);
  }

  private checkApplicationProcessPermissionForTutor(
    application: TutorApplyForClass,
    userId: string,
    newStatus: ApplicationStatus
  ) {
    // A tutor can do the following:
    // 1. Approve/Reject an invite
    // 2. Cancel his own previous application
    // Last but not least, the application must be about him
    const isApprovingOrRejectInvite = application.isDesignated === true
      && (newStatus === ApplicationStatus.APPROVED || newStatus === ApplicationStatus.REJECTED);
    const isCancellingOwnApplication = application.isDesignated === false
      && newStatus === ApplicationStatus.CANCELLED;
    if (!isApprovingOrRejectInvite || !isCancellingOwnApplication) {
      throw new BadRequestException("There is something wrong with your request");
    }

    const isApplicationAboutCurrentUser = application.tutorId === userId;
    if (!isApplicationAboutCurrentUser) {
      throw new ForbiddenException("This is not your application");
    }
  }

  private async checkApplicationProcessPermissionForStudent(
    application: TutorApplyForClass,
    userId: string,
    newStatus: ApplicationStatus
  ) {
    // A student can do the following
    // Approve/Reject an application by tutor
    // Furthermore, the class of the application must be of him
    const isApprovingOrRejectTutorApplication = application.isDesignated === false
      && (newStatus === ApplicationStatus.APPROVED || newStatus === ApplicationStatus.REJECTED);
    if (!isApprovingOrRejectTutorApplication) {
      throw new BadRequestException("There is something wrong with your request");
    }

    const classToProcessApplication = await this.getClassById(application.classId);
    if (classToProcessApplication.studentId !== userId) {
      throw new ForbiddenException("This application doesn't belong to any of your class");
    }
  }

  async getClassById(id: string) {
    return firstValueFrom(this.client.send<Class>({ cmd: 'getClassById' }, id));
  }

  async cancelTutorApplyForClass(id: string) {
    return this.updateStatus(id, ApplicationStatus.CANCELLED);
  }

  async rejectTutorApplyForClass(id: string) {
    return this.updateStatus(id, ApplicationStatus.REJECTED);
  }

  async approveTutorApplyForClass(id: string) {
    return this.updateStatus(id, ApplicationStatus.APPROVED);
  }

  async setAllApplicationToClassDeletedByClassId(classId: string): Promise<void> {
    const allApplications = await this.tutorApplyForClassRepository.find({
      where: {
        classId,
      }
    });
    await Promise.allSettled(allApplications.map(application =>
      this.updateStatus(application.id, ApplicationStatus.CLASS_DELETED)
    ));
  }

  async setPendingStatusToFilled(classId: string) {
    const pendingApplications = await this.tutorApplyForClassRepository.find({
      where: {
        classId,
        status: ApplicationStatus.PENDING
      }
    });
    await Promise.allSettled(pendingApplications.map(application =>
      this.updateStatus(application.id, ApplicationStatus.FILLED)
    ));
  }

  async updateStatus(id: string, newStatus: ApplicationStatus): Promise<TutorApplyForClass> {
    const application = await this.getApplicationById(id);
    this.validateStatusTransition(application.status, newStatus);
    application.status = newStatus;
    const updatedApplication = await this.tutorApplyForClassRepository.save(application);
    this.classApplicationEventDispatcher.dispatchClassApplicationUpdatedEvent(updatedApplication);
    return updatedApplication;
  }

  private async checkExistingApprovedApplication(classId: string): Promise<void> {
    const existingApprovedApplication = await this.tutorApplyForClassRepository.findOne({
      where: { classId, status: ApplicationStatus.APPROVED },
    });

    if (existingApprovedApplication) {
      throw new BadRequestException('There is already an approved application for this class');
    }
  }

  private async checkReApplyWhilePending(tutorId: string, classId: string): Promise<void> {
    const existingPendingApplication = await this.tutorApplyForClassRepository.findOne({
      where: { tutorId, classId, status: ApplicationStatus.PENDING },
    });

    if (existingPendingApplication) {
      throw new BadRequestException("You've already had an pending application to this class");
    }
  }

  private validateStatusTransition(currentStatus: ApplicationStatus, newStatus: ApplicationStatus): void {
    // Always valid
    if (newStatus === ApplicationStatus.CLASS_DELETED) {
      return;
    }
    if (newStatus === ApplicationStatus.PENDING) {
      throw new BadRequestException(`Cannot set an application status to PENDING`);
    }
    // Every other status changes requires current status to be PENDING
    if (currentStatus !== ApplicationStatus.PENDING) {
      throw new BadRequestException(`Cannot ${newStatus.toLowerCase()} application with status other than PENDING`);
    }
  }
}
