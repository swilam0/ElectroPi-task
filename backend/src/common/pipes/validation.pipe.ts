import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

@Injectable()
export class ValidationPipe implements PipeTransform {
  async transform(value: unknown, metadata: ArgumentMetadata) {
    if (!metadata.metatype || !this.shouldValidate(metadata.metatype)) {
      return value;
    }

    const object = plainToInstance(metadata.metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const fieldErrors: Record<string, string> = {};
      this.flattenErrors(errors, fieldErrors);
      throw new BadRequestException({
        status: 'fail',
        data: fieldErrors,
      });
    }

    return object;
  }

  private flattenErrors(errors: ValidationError[], result: Record<string, string>, parent?: string) {
    for (const error of errors) {
      const property = parent ? `${parent}.${error.property}` : error.property;
      if (error.constraints) {
        result[property] = Object.values(error.constraints)[0];
      }
      if (error.children && error.children.length > 0) {
        this.flattenErrors(error.children, result, property);
      }
    }
  }

  private shouldValidate(metatype: new (...args: unknown[]) => unknown): boolean {
    const types: (new (...args: unknown[]) => unknown)[] = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !types.includes(metatype);
  }
}
