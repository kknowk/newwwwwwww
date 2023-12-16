import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class JsonPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type === 'body') {
      try {
        if (typeof value === 'string') {
          return JSON.parse(value);
        } else {
          return value;
        }
      } catch (error) {
        console.error(error);
        throw new BadRequestException(error);
      }
    }
    return value;
  }
}
