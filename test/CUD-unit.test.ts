import { TestingModule } from '@nestjs/testing';
import { TutorApplyForClassService } from '../src/tutor-apply-for-class.service';
import { buildTestingModule } from './build-testing-module';
import { TutorApplyForClassCreateDto } from '../src/dtos';
import { ApplicationStatus, BroadcastService } from '@tutorify/shared';
import { v4 as uuidv4 } from 'uuid';
import { TutorApplyForClass } from '../src/tutor-apply-for-class.entity';
import { TutorApplyForClassRepository } from '../src/tutor-apply-for-class.repository';
import { seedData } from './seed-data';

describe('TutorApplyForClassService', () => {
  let service: TutorApplyForClassService;
  let repository: TutorApplyForClassRepository;
  let broadcastService: BroadcastService;

  beforeEach(async () => {
    const module: TestingModule = await buildTestingModule();
    service = module.get<TutorApplyForClassService>(TutorApplyForClassService);
    repository = module.get<TutorApplyForClassRepository>(TutorApplyForClassRepository);
    broadcastService = module.get<BroadcastService>(BroadcastService);
    // Mock broadcasting event
    jest.spyOn(broadcastService, 'broadcastEventToAllMicroservices').mockResolvedValueOnce();
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear all mock calls after each test
  });

  xit('should insert a new class application', async () => {
    // Arrange
    const classApplicationCreateDto: TutorApplyForClassCreateDto = {
      classId: uuidv4(),
      tutorId: uuidv4(),
      isDesignated: false,
      appliedAt: new Date(),
    };

    // Act
    const insertedClassApplication: TutorApplyForClass = await service.addNewApplication(classApplicationCreateDto);

    // Assert
    expect(insertedClassApplication).toEqual(expect.objectContaining(classApplicationCreateDto));
    expect(insertedClassApplication.id).toBeDefined();
    expect(insertedClassApplication.status).toEqual(ApplicationStatus.PENDING);
    expect(insertedClassApplication.approvedAt).toEqual(null);

    // Act
    const classApplications = await service.getAllApplications({});

    // Assert
    expect(classApplications).toHaveLength(1);
    expect(classApplications[0]).toEqual(insertedClassApplication);
  });

  it('should change status of application to CANCELLED', async () => {
    // Arrange
    await repository.save(seedData);
    const randomClassApplication = await repository.findOneBy({});

    // Act
    const res = await service.cancelTutorApplyForClass(randomClassApplication.id);
    const cancelledApplcation = await service.getApplicationById(randomClassApplication.id);

    // Assert
    expect(res).toBe(true);
    expect(cancelledApplcation.status).toEqual(ApplicationStatus.CANCELLED);
  });
});
