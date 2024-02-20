import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { SagaCompensationError, SagaInvocationError } from 'nestjs-saga';

@Catch()
export class GlobalExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, _: ArgumentsHost) {
    if (exception instanceof RpcException) {
      // If it's already an RcpException, leave it unchanged
      throw exception;
    } else if (exception instanceof HttpException) {
      throw new RpcException(exception.getResponse());
    } else if (exception instanceof SagaInvocationError || exception instanceof SagaCompensationError) {
      console.log('ORIGINAL ERROR', exception.originalError);
      console.log('STEP', exception.step);
      const httpException = exception.originalError as HttpException;
      throw new RpcException(httpException.getResponse());
    } else {
      console.log(exception)
      throw exception;
    }
  }
}