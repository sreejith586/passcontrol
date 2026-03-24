import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../infra/responses/api-response';
import { SelfOnboardingSignupDto } from '../dto/self-onboarding-signup.dto';
import { SelfOnboardingVerifyEmailDto } from '../dto/self-onboarding-verify-email.dto';
import { SelfOnboardingService } from '../self-onboarding.service';

/**
 * Public tenant self-onboarding (no JWT). Provisions organization + first org admin.
 */
@Controller({ path: 'public/self-onboarding', version: '1' })
@ApiTags('Public — self-onboarding')
export class SelfOnboardingController {
  constructor(private readonly selfOnboarding: SelfOnboardingService) {}

  @Post('signup')
  @ApiOperation({
    summary: 'Self-service signup',
    description:
      'Creates a new organization, first user as Org Admin, and sends email verification. Does not return tokens.',
  })
  async signup(@Body() dto: SelfOnboardingSignupDto) {
    const result = await this.selfOnboarding.signup(dto);
    return ApiResponse.ok(result);
  }

  @Post('verify-email')
  @ApiOperation({
    summary: 'Verify email',
    description:
      'Completes signup email verification using the token from the verification link. Public; no authentication.',
  })
  async verifyEmail(@Body() dto: SelfOnboardingVerifyEmailDto) {
    const result = await this.selfOnboarding.verifyEmail(dto);
    return ApiResponse.ok(result);
  }
}
