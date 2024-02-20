import { ApplicationStatus } from '@tutorify/shared';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class TutorApplyForClass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  classId: string;

  @Column({ nullable: false })
  tutorId: string;

  @Column({ type: 'enum', enum: ApplicationStatus, nullable: false, default: ApplicationStatus.PENDING })
  status: ApplicationStatus;

  @Column({ default: false, nullable: false })
  isDesignated: boolean;

  @Column({ nullable: false })
  appliedAt: Date;

  @Column({ nullable: true })
  approvedAt: Date;
}