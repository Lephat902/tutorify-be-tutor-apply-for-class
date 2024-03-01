import { Test } from "@nestjs/testing";
import { setupDataSource } from "./setup-data-source";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { TutorApplyForClassService } from "../src/tutor-apply-for-class.service";
import { TutorApplyForClassRepository } from "../src/tutor-apply-for-class.repository";
import { CqrsModule } from "@nestjs/cqrs";
import { BroadcastModule } from "@tutorify/shared";

export const buildTestingModule = async () => {
    const dataSource = await setupDataSource();
    const testingModule = await Test.createTestingModule({
        imports: [
            TypeOrmModule.forRoot({
                name: 'default',
                synchronize: true,
            }),
            CqrsModule,
            BroadcastModule,
        ],
        providers: [
            TutorApplyForClassService,
            TutorApplyForClassRepository,
        ]
    })
        .overrideProvider(DataSource)
        .useValue(dataSource)
        .compile();

    return testingModule;
};