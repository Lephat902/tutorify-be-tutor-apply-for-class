import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { TutorApplyForClass } from './tutor-apply-for-class.entity';
import { ApplicationStatus } from '@tutorify/shared';
import { TutorApplyForClassRepository } from './tutor-apply-for-class.repository';
import { TutorApplyForClassCreateDto, TutorApplyForClassQueryDto } from './dtos';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CommandBus } from '@nestjs/cqrs';
import { ApproveApplicationSagaCommand } from './sagas/impl';

@Injectable()
export class TutorApplyForClassService {
  constructor(
    private readonly tutorApplyForClassRepository: TutorApplyForClassRepository,
    @Inject('CLASS_SERVICE') private readonly client: ClientProxy,
    private readonly commandBus: CommandBus,
  ) { }

  async addNewApplication(tutorApplyForClassCreateDto: TutorApplyForClassCreateDto): Promise<TutorApplyForClass> {
    await this.checkExistingApprovedApplication(tutorApplyForClassCreateDto.classId);
    return this.tutorApplyForClassRepository.save(tutorApplyForClassCreateDto);
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
    await this.updateStatus(id, ApplicationStatus.CANCELLED);
    return true;
  }

  async rejectTutorApplyForClass(id: string) {
    await this.updateStatus(id, ApplicationStatus.REJECTED);
    return true;
  }

  async approveTutorApplyForClass(id: string) {
    return this.commandBus.execute(new ApproveApplicationSagaCommand(id));
  }

  // newStatus is PENDING just in case of compensation
  async updateStatus(id: string, newStatus: ApplicationStatus): Promise<TutorApplyForClass> {
    const application = await this.getApplicationById(id);
    this.validateStatusTransition(application.status, newStatus);
    application.status = newStatus;
    if (newStatus === ApplicationStatus.APPROVED) {
      application.approvedAt = new Date();
    } else if (newStatus === ApplicationStatus.PENDING) {
      application.approvedAt = null;
    }
    return this.tutorApplyForClassRepository.save(application);
  }

  async updateTutorOfClass(classId: string, tutorId: string) {
    const updateDto = { tutorId };
    await firstValueFrom(this.client.send({ cmd: 'updateClass' }, {
      id: classId,
      classData: updateDto,
    }));
  }

  async setPendingStatusToFilled(classId: string) {
    await this.tutorApplyForClassRepository.createQueryBuilder()
      .update()
      .set({ status: ApplicationStatus.FILLED })
      .where('classId = :classId AND status = :status', { classId, status: ApplicationStatus.PENDING })
      .execute();
  }

  private async checkExistingApprovedApplication(classId: string): Promise<void> {
    const existingApprovedApplication = await this.tutorApplyForClassRepository.findOne({
      where: { classId, status: ApplicationStatus.APPROVED },
    });

    if (existingApprovedApplication) {
      throw new BadRequestException('There is already an approved application for this class');
    }
  }

  private validateStatusTransition(currentStatus: ApplicationStatus, newStatus: ApplicationStatus): void {
    if (currentStatus !== ApplicationStatus.PENDING && newStatus !== ApplicationStatus.PENDING) {
      throw new BadRequestException(`Cannot ${newStatus.toLowerCase()} application with status other than PENDING`);
    }
  }
}
