import { Builder, Saga } from 'nestjs-saga';
import { ApproveApplicationSagaCommand } from '../impl';
import { TutorApplyForClassService } from 'src/tutor-apply-for-class.service';
import { ApplicationStatus } from '@tutorify/shared/enums';
import { TutorApplyForClass } from 'src/tutor-apply-for-class.entity';

// If step throws error then compensation chain is started in a reverse order:
// step1 -> step2 -> step3(X) -> compensation2 -> compensation1

@Saga(ApproveApplicationSagaCommand)
export class ApproveApplicationSagaHandler {
  constructor(
    private readonly tutorApplyForClassService: TutorApplyForClassService,
  ) { }
  private application: TutorApplyForClass;

  saga = new Builder<ApproveApplicationSagaCommand, boolean>()

    .step('Update application status')
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
  }

  async step2(cmd: ApproveApplicationSagaCommand) {
    const { tutorId, classId } = this.application;
    await this.tutorApplyForClassService.updateTutorOfClass(classId, tutorId);
  }

  async step3(cmd: ApproveApplicationSagaCommand) {
    const { classId } = this.application;
    await this.tutorApplyForClassService.setPendingStatusToFilled(classId);
  }

  async step1Compensation(cmd: ApproveApplicationSagaCommand) {
    await this.tutorApplyForClassService.updateStatus(cmd.id, ApplicationStatus.PENDING);
  }

  async step2Compensation(cmd: ApproveApplicationSagaCommand) {
    const { classId } = this.application;
    await this.tutorApplyForClassService.updateTutorOfClass(classId, null);
  }

  buildResult(cmd: ApproveApplicationSagaCommand): boolean {
    return true;
  }
}