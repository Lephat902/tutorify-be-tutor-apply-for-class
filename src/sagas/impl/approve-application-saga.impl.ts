import { ICommand } from '@nestjs/cqrs';

export class ApproveApplicationSagaCommand implements ICommand {
    constructor(
        public readonly id: string,
    ) { }
}