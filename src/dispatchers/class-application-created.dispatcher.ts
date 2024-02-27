import { BroadcastService, ClassApplicationCreatedEvent, ClassApplicationCreatedEventPayload } from "@tutorify/shared";
import { Builder } from "builder-pattern";
import { TutorApplyForClass } from "src/tutor-apply-for-class.entity";

export function dispatchClassApplicationCreatedEvent(broadcastService: BroadcastService, newClassApplication: TutorApplyForClass) {
    const { id, tutorId, classId, isDesignated, appliedAt } = newClassApplication
    const eventPayload = Builder<ClassApplicationCreatedEventPayload>()
        .classApplicationId(id)
        .tutorId(tutorId)
        .classId(classId)
        .isDesignated(isDesignated)
        .appliedAt(appliedAt)
        .build();
    const event = new ClassApplicationCreatedEvent(eventPayload);
    broadcastService.broadcastEventToAllMicroservices(event.pattern, event.payload);
}