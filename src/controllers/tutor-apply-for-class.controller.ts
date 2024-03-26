import { Controller } from '@nestjs/common';
import { TutorApplyForClass } from '../tutor-apply-for-class.entity';
import { TutorApplyForClassService } from '../tutor-apply-for-class.service';
import { ProcessApplicationDto, TutorApplyForClassCreateDto, TutorApplyForClassQueryDto } from '../dtos';
import { MessagePattern } from '@nestjs/microservices';
import { DesignateTutorsToClassDto } from '@tutorify/shared';

@Controller()
export class TutorApplyForClassController {
  constructor(private readonly tutorApplyForClassService: TutorApplyForClassService) { }

  @MessagePattern({ cmd: 'addNewApplication' })
  async addNewApplication(tutorApplyForClassCreateDto: TutorApplyForClassCreateDto): Promise<TutorApplyForClass> {
    return this.tutorApplyForClassService.addNewApplication(tutorApplyForClassCreateDto);
  }

  @MessagePattern({ cmd: 'designateTutors' })
  async designateTutors(data: DesignateTutorsToClassDto): Promise<TutorApplyForClass[]> {
    return this.tutorApplyForClassService.designateTutors(data.classId, data.tutorIds);
  }

  @MessagePattern({ cmd: 'getApplicationById' })
  async getApplicationById(id: string): Promise<TutorApplyForClass> {
    return this.tutorApplyForClassService.getApplicationById(id);
  }

  @MessagePattern({ cmd: 'getAllApplications' })
  async getAllApplications(filters: TutorApplyForClassQueryDto): Promise<TutorApplyForClass[]> {
    return this.tutorApplyForClassService.getAllApplications(filters);
  }

  @MessagePattern({ cmd: 'processApplication' })
  async processApplication(processApplicationDto: ProcessApplicationDto) {
    return this.tutorApplyForClassService.processApplication(processApplicationDto);
  }
}
