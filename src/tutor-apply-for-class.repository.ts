import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TutorApplyForClass } from './tutor-apply-for-class.entity';
import { TutorApplyForClassQueryDto } from './dtos';
import { ApplicationStatus } from '@tutorify/shared';

@Injectable()
export class TutorApplyForClassRepository extends Repository<TutorApplyForClass> {
  constructor(private dataSource: DataSource) {
    super(TutorApplyForClass, dataSource.createEntityManager());
  }

  async getAllApplications(filters: TutorApplyForClassQueryDto): Promise<TutorApplyForClass[]> {
    const queryBuilder = this.createQueryBuilder('tutorApplyForClass');

    if (filters.tutorId) {
      queryBuilder.andWhere('tutorApplyForClass.tutorId = :tutorId', { tutorId: filters.tutorId });
    }

    if (filters.classId) {
      queryBuilder.andWhere('tutorApplyForClass.classId = :classId', { classId: filters.classId });
    }

    if (filters.isDesignated !== undefined) {
      queryBuilder.andWhere('tutorApplyForClass.isDesignated = :isDesignated', { isDesignated: filters.isDesignated });
    }

    if (filters.applicationStatuses && filters.applicationStatuses.length > 0) {
      queryBuilder.andWhere('tutorApplyForClass.status IN (:...statuses)', { statuses: filters.applicationStatuses });
    }

    if (filters.order && filters.dir) {
      queryBuilder.orderBy(`tutorApplyForClass.${filters.order}`, filters.dir);
    }

    if (filters.page && filters.limit) {
      queryBuilder.skip((filters.page - 1) * filters.limit).take(filters.limit);
    }

    if (!filters.includeDeletedClass) {
      queryBuilder.andWhere('tutorApplyForClass.status != :status', { status: ApplicationStatus.CLASS_DELETED });
    }

    return queryBuilder.getMany();
  }
}
