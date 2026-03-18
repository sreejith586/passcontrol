import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateAlertWorkflowDto } from './update-alert-workflow.dto';

describe('UpdateAlertWorkflowDto', () => {
  it('accepts valid boolean true', async () => {
    const dto = plainToInstance(UpdateAlertWorkflowDto, {
      requireResolutionNoteOnResolve: true,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts valid boolean false', async () => {
    const dto = plainToInstance(UpdateAlertWorkflowDto, {
      requireResolutionNoteOnResolve: false,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts empty object (all optional for partial update)', async () => {
    const dto = plainToInstance(UpdateAlertWorkflowDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts requireReopenNoteOnReopen', async () => {
    const dto = plainToInstance(UpdateAlertWorkflowDto, {
      requireReopenNoteOnReopen: true,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts both fields', async () => {
    const dto = plainToInstance(UpdateAlertWorkflowDto, {
      requireResolutionNoteOnResolve: true,
      requireReopenNoteOnReopen: false,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects string instead of boolean', async () => {
    const dto = plainToInstance(UpdateAlertWorkflowDto, {
      requireResolutionNoteOnResolve: 'true',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects number instead of boolean', async () => {
    const dto = plainToInstance(UpdateAlertWorkflowDto, {
      requireResolutionNoteOnResolve: 1,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
