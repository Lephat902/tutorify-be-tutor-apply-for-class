import { BroadcastService, ClassApplicationUpdatedEvent, ClassApplicationUpdatedEventPayload } from "@tutorify/shared";
import { Builder } from "builder-pattern";
import { TutorApplyForClass } from "src/tutor-apply-for-class.entity";

export function dispatchClassApplicationUpdatedEvent(broadcastService: BroadcastService, newClassApplication: TutorApplyForClass) {
    const { id, tutorId, classId, status } = newClassApplication
    const eventPayload = Builder<ClassApplicationUpdatedEventPayload>()
        .classApplicationId(id)
        .tutorId(tutorId)
        .classId(classId)
        .newStatus(status)
        .build();
    const event = new ClassApplicationUpdatedEvent(eventPayload);
    broadcastService.broadcastEventToAllMicroservices(event.pattern, event.payload);
}