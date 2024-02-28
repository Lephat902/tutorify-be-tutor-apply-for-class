import { Builder, Saga } from 'nestjs-saga';
import { ApproveApplicationSagaCommand } from '../impl';
import { TutorApplyForClassService } from 'src/tutor-apply-for-class.service';
import { ApplicationStatus } from '@tutorify/shared/enums';
import { TutorApplyForClass } from 'src/tutor-apply-for-class.entity';
import { TutorApplyForClassRepository } from 'src/tutor-apply-for-class.repository';

// If step throws error then compensation chain is started in a reverse order:
// step1 -> step2 -> step2(X) -> compensation2 -> compensation1

@Saga(ApproveApplicationSagaCommand)
export class ApproveApplicationSagaHandler {
  constructor(
    private readonly tutorApplyForClassService: TutorApplyForClassService,
    private readonly tutorApplyForClassRepository: TutorApplyForClassRepository,
  ) { }
  private updatedApplication: TutorApplyForClass;

  saga = new Builder<ApproveApplicationSagaCommand, TutorApplyForClass>()

    .step('Update application status, approvement day')
    .invoke(this.step1)
    .withCompensation(this.step1Compensation)

    .step('Set others which are PENDING to FILLED')
    .invoke(this.step2)

    .return(this.buildResult)

    .build();

  async step1(cmd: ApproveApplicationSagaCommand) {
    this.updatedApplication = await this.tutorApplyForClassService.updateStatus(cmd.id, ApplicationStatus.APPROVED);
    this.updatedApplication.approvedAt = new Date();
  }

  async step2(cmd: ApproveApplicationSagaCommand) {
    const { classId } = this.updatedApplication;
    await this.setPendingStatusToFilled(classId);
  }

  async step1Compensation(cmd: ApproveApplicationSagaCommand) {
    await this.tutorApplyForClassService.updateStatus(cmd.id, ApplicationStatus.PENDING);
    this.updatedApplication.approvedAt = null;
  }

  buildResult(cmd: ApproveApplicationSagaCommand): TutorApplyForClass {
    return this.updatedApplication;
  }

  // helper methods
  async setPendingStatusToFilled(classId: string) {
    await this.tutorApplyForClassRepository.createQueryBuilder()
      .update()
      .set({ status: ApplicationStatus.FILLED })
      .where('classId = :classId AND status = :status', { classId, status: ApplicationStatus.PENDING })
      .execute();
  }
}