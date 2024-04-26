import { Injectable } from '@nestjs/common';
import { TutorApplyForClass } from './tutor-apply-for-class.entity';
import {
    BroadcastService,
    ClassApplicationCreatedEvent,
    ClassApplicationCreatedEventPayload,
    ClassApplicationUpdatedEvent,
    ClassApplicationUpdatedEventPayload
} from '@tutorify/shared';
import { Builder } from 'builder-pattern';

@Injectable()
export class ClassApplicationEventDispatcher {
    constructor(
        private readonly broadcastService: BroadcastService,
    ) { }

    dispatchClassApplicationCreatedEvent(newClassApplication: TutorApplyForClass) {
        const { id, tutorId, classId, isDesignated, appliedAt } = newClassApplication
        const eventPayload = Builder<ClassApplicationCreatedEventPayload>()
            .classApplicationId(id)
            .tutorId(tutorId)
            .classId(classId)
            .isDesignated(isDesignated)
            .appliedAt(appliedAt)
            .build();
        const event = new ClassApplicationCreatedEvent(eventPayload);
        this.broadcastService.broadcastEventToAllMicroservices(event.pattern, event.payload);
    }

    dispatchClassApplicationUpdatedEvent(updatedApplication: TutorApplyForClass) {
        const { id, tutorId, classId, status, isDesignated } = updatedApplication;
        const eventPayload = Builder<ClassApplicationUpdatedEventPayload>()
            .classApplicationId(id)
            .isDesignated(isDesignated)
            .tutorId(tutorId)
            .classId(classId)
            .newStatus(status)
            .build();
        const event = new ClassApplicationUpdatedEvent(eventPayload);
        this.broadcastService.broadcastEventToAllMicroservices(event.pattern, event.payload);
    }

    dispatchClassApplicationsUpdatedEvent(updatedApplications: TutorApplyForClass[]) {
        updatedApplications.forEach(application => {
            this.dispatchClassApplicationUpdatedEvent(application);
        })
    }
}
