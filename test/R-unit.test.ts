import { TestingModule } from '@nestjs/testing';
import { TutorApplyForClassService } from '../src/tutor-apply-for-class.service';
import { buildTestingModule } from './build-testing-module';
import { BroadcastService } from '@tutorify/shared';
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

  xit('should return an empty array when there are no class applications', async () => {
    // Act
    const classApplications = await service.getAllApplications({});

    // Assert
    expect(classApplications).toEqual([]);
  });

  xit('should return the same as seed data', async () => {
    // Arrange
    await repository.save(seedData);

    // Act
    const classApplications = await service.getAllApplications({});

    // Assert
    expect(classApplications).toEqual(expect.arrayContaining(seedData));
  });

  xit('should return class applications belong to a tutor', async () => {
    // Arrange
    await repository.save(seedData);
    const randomClassApplication = await repository.findOneBy({});

    // Act
    const classApplicationsByTutorId = await service.getAllApplications({
      tutorId: randomClassApplication.tutorId,
    });

    // Assert
    expect(classApplicationsByTutorId
      .every(application => application.tutorId === randomClassApplication.tutorId)
    )
      .toBe(true);
  });

  it('should return class applications belong to a class', async () => {
    // Arrange
    await repository.save(seedData);
    const randomClassApplication = await repository.findOneBy({});

    // Act
    const classApplicationsByClassId = await service.getAllApplications({
      classId: randomClassApplication.classId,
    });

    // Assert
    expect(classApplicationsByClassId
      .every(application => application.classId === randomClassApplication.classId)
    )
      .toBe(true);
  });

  it('should return only two records with pagination', async () => {
    // Arrange
    await repository.save(seedData);

    // Act
    const classApplications = await service.getAllApplications({
      page: 1,
      limit: 2,
    });

    // Assert
    expect(classApplications).toHaveLength(2);
  });
});
