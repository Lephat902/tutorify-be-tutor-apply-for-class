import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TutorApplyForClass } from './tutor-apply-for-class.entity';
import { ApplicationStatus, BroadcastService } from '@tutorify/shared';
import { TutorApplyForClassRepository } from './tutor-apply-for-class.repository';
import { TutorApplyForClassCreateDto, TutorApplyForClassQueryDto } from './dtos';
import { CommandBus } from '@nestjs/cqrs';
import { ApproveApplicationSagaCommand } from './sagas/impl';
import { dispatchClassApplicationCreatedEvent, dispatchClassApplicationUpdatedEvent } from './dispatchers';

@Injectable()
export class TutorApplyForClassService {
  constructor(
    private readonly tutorApplyForClassRepository: TutorApplyForClassRepository,
    private readonly commandBus: CommandBus,
    private readonly broadcastService: BroadcastService,
  ) { }

  async addNewApplication(tutorApplyForClassCreateDto: TutorApplyForClassCreateDto): Promise<TutorApplyForClass> {
    const { tutorId, classId } = tutorApplyForClassCreateDto;
    await this.checkExistingApprovedApplication(classId);
    await this.checkReApplyWhilePending(tutorId, classId);
    const newClassApplication = await this.tutorApplyForClassRepository.save(tutorApplyForClassCreateDto);
    dispatchClassApplicationCreatedEvent(this.broadcastService, newClassApplication);
    return newClassApplication;
  }

  async designateTutors(classId: string, tutorIds: string[]): Promise<TutorApplyForClass[]> {
    const tutorApplications = tutorIds.map(tutorId => {
      return this.tutorApplyForClassRepository.create({
        classId,
        tutorId,
        isDesignated: true,
        appliedAt: new Date(),
      });
    });

    const newClassApplications = await this.tutorApplyForClassRepository.save(tutorApplications);
    newClassApplications.map(newClassApplication => {
      dispatchClassApplicationCreatedEvent(this.broadcastService, newClassApplication);
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

  async cancelTutorApplyForClass(id: string) {
    const updatedApplication = await this.updateStatus(id, ApplicationStatus.CANCELLED);
    dispatchClassApplicationUpdatedEvent(this.broadcastService, updatedApplication);
    return true;
  }

  async rejectTutorApplyForClass(id: string) {
    const updatedApplication = await this.updateStatus(id, ApplicationStatus.REJECTED);
    dispatchClassApplicationUpdatedEvent(this.broadcastService, updatedApplication);
    return true;
  }

  async approveTutorApplyForClass(id: string) {
    const updatedApplication = await this.commandBus.execute(new ApproveApplicationSagaCommand(id));
    dispatchClassApplicationUpdatedEvent(this.broadcastService, updatedApplication);
    return true;
  }

  // newStatus is PENDING just in case of compensation
  async updateStatus(id: string, newStatus: ApplicationStatus): Promise<TutorApplyForClass> {
    const application = await this.getApplicationById(id);
    this.validateStatusTransition(application.status, newStatus);
    application.status = newStatus;
    return this.tutorApplyForClassRepository.save(application);
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
    if (currentStatus !== ApplicationStatus.PENDING && newStatus !== ApplicationStatus.PENDING) {
      throw new BadRequestException(`Cannot ${newStatus.toLowerCase()} application with status other than PENDING`);
    }
  }
}
