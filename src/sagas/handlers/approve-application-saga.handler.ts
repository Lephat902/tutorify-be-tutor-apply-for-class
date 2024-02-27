import { Builder, Saga } from 'nestjs-saga';
import { ApproveApplicationSagaCommand } from '../impl';
import { TutorApplyForClassService } from 'src/tutor-apply-for-class.service';
import { ApplicationStatus, QueueNames } from '@tutorify/shared/enums';
import { TutorApplyForClass } from 'src/tutor-apply-for-class.entity';
import { TutorApplyForClassRepository } from 'src/tutor-apply-for-class.repository';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

// If step throws error then compensation chain is started in a reverse order:
// step1 -> step2 -> step3(X) -> compensation2 -> compensation1

@Saga(ApproveApplicationSagaCommand)
export class ApproveApplicationSagaHandler {
  constructor(
    private readonly tutorApplyForClassService: TutorApplyForClassService,
    private readonly tutorApplyForClassRepository: TutorApplyForClassRepository,
    @Inject(QueueNames.CLASS_AND_CATEGORY) private readonly client: ClientProxy,
  ) { }
  private application: TutorApplyForClass;

  saga = new Builder<ApproveApplicationSagaCommand, boolean>()

    .step('Update application status, app')
    .invoke(this.step1)
    .withCompensation(this.step1Compensation)

    .step('Update tutor of class')
    .invoke(this.step2)
    .withCompensation(this.step2Compensation)

    .step('Set others which are PENDING to FILLED')
    .invoke(this.step3)

    .return(this.buildResult)

    .build();

  async step1(cmd: ApproveApplicationSagaCommand) {
    this.application = await this.tutorApplyForClassService.updateStatus(cmd.id, ApplicationStatus.APPROVED);
    this.application.approvedAt = new Date();
  }

  async step2(cmd: ApproveApplicationSagaCommand) {
    const { tutorId, classId } = this.application;
    await this.updateTutorOfClass(classId, tutorId);
  }

  async step3(cmd: ApproveApplicationSagaCommand) {
    const { classId } = this.application;
    await this.setPendingStatusToFilled(classId);
  }

  async step1Compensation(cmd: ApproveApplicationSagaCommand) {
    await this.tutorApplyForClassService.updateStatus(cmd.id, ApplicationStatus.PENDING);
    this.application.approvedAt = null;
  }

  async step2Compensation(cmd: ApproveApplicationSagaCommand) {
    const { classId } = this.application;
    await this.updateTutorOfClass(classId, null);
  }

  buildResult(cmd: ApproveApplicationSagaCommand): boolean {
    return true;
  }

  // helper methods
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
}