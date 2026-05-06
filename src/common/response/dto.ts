import { ApiProperty } from '@nestjs/swagger';

// General response wrapper
export class GeneralResponse<T> {
  @ApiProperty({ description: 'Response data' })
  data!: T;
}

// Response helper functions
export const Response = {
  OK: <T>(data: T): GeneralResponse<T> => ({ data }),
  Created: <T>(data: T): GeneralResponse<T> => ({ data }),
  NoContent: (): { data: null } => ({ data: null }),
};
