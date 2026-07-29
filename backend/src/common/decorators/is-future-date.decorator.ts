import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          const date = new Date(value);
          if (isNaN(date.getTime())) return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return date >= today;
        },
        defaultMessage() {
          return 'dueDate must be today or a future date';
        },
      },
    });
  };
}
