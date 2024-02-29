import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { ClassDeletedEventPattern, ClassDeletedEventPayload } from '@tutorify/shared';
import { TutorApplyForClassService } from 'src/tutor-apply-for-class.service';

@Controller()
export class TutorApplyForClassControllerEventHandler {
  constructor(private readonly tutorApplyForClassService: TutorApplyForClassService) { }

  @EventPattern(new ClassDeletedEventPattern())
  async handleClassDeleted(payload: ClassDeletedEventPayload) {
    console.log('Start setting all applications of this class to CLASS_DELETED (id any)')
    const { classId } = payload;
    this.tutorApplyForClassService.setAllApplicationToClassDeletedByClassId(classId);
  }
}
