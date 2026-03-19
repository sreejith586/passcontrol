import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ValidateSetupTokenDto } from './dto/validate-setup-token.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { JwtAuthGuard } from './guards/auth.guard';
import { ApiResponse } from '../infra/responses/api-response';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const result = await this.auth.login(dto);
    return ApiResponse.ok(result);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    const result = await this.auth.refresh(dto.refreshToken);
    return ApiResponse.ok(result);
  }

  @Post('validate-setup-token')
  async validateSetupToken(@Body() dto: ValidateSetupTokenDto) {
    const result = await this.auth.validateSetupToken(dto.token);
    return ApiResponse.ok(result);
  }

  @Post('set-password')
  async setPassword(@Body() dto: SetPasswordDto) {
    const result = await this.auth.setPassword(
      dto.token,
      dto.password,
      dto.passwordConfirm,
    );
    return ApiResponse.ok(result);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request & { user: { userId: string; organizationId: string } }) {
    const result = await this.auth.me(req.user.userId, req.user.organizationId);
    return ApiResponse.ok(result);
  }
}
