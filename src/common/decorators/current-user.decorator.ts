import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

interface CurrentUser {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUser | undefined, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Not authenticated');
    }

    return data ? user[data] : user;
  },
);
