import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { ClassCreatedEventPattern, ClassCreatedEventPayload, ClassDeletedEventPattern, ClassDeletedEventPayload } from '@tutorify/shared';
import { TutorApplyForClassService } from 'src/tutor-apply-for-class.service';

@Controller()
export class TutorApplyForClassControllerEventHandler {
  constructor(private readonly tutorApplyForClassService: TutorApplyForClassService) { }

  @EventPattern(new ClassCreatedEventPattern())
  async handleClassCreated(payload: ClassCreatedEventPayload) {
    console.log('Start designating tutors to a class (if any)')
    const { classId, desiredTutorIds } = payload;
    if (desiredTutorIds)
      await this.tutorApplyForClassService.designateTutors(classId, desiredTutorIds);
  }

  @EventPattern(new ClassDeletedEventPattern())
  async handleClassDeleted(payload: ClassDeletedEventPayload) {
    console.log('Start setting all applications of this class to CLASS_DELETED (if any)')
    const { classId } = payload;
    this.tutorApplyForClassService.setAllApplicationToClassDeletedByClassId(classId);
  }
}
