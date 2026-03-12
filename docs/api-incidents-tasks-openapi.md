# Incidents & Tasks API – Swagger/OpenAPI Annotations

Use these annotations with NestJS `@nestjs/swagger` (e.g. `ApiTags`, `ApiOperation`, `ApiResponse`, `ApiBody`, `ApiQuery`, `ApiBearerAuth`, `ApiParam`).

---

## 1. Incidents Controller Annotations

```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('Incidents')
@ApiBearerAuth('access-token')
@Controller({ path: 'incidents', version: '1' })
export class IncidentsController {
  @Post()
  @ApiOperation({ summary: 'Create incident', description: 'Create a new incident (manual or linked to checklist/asset).' })
  @ApiBody({ type: CreateIncidentDto })
  @ApiResponse({ status: 201, description: 'Incident created.' })
  @ApiResponse({ status: 400, description: 'Validation or scope error.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  async create(...) {}

  @Get()
  @ApiOperation({ summary: 'List incidents', description: 'List incidents with filters and pagination.' })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'zoneId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] })
  @ApiQuery({ name: 'severity', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'reportedFrom', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'reportedTo', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of incidents.' })
  async list(...) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get incident by ID' })
  @ApiParam({ name: 'id', description: 'Incident UUID' })
  @ApiResponse({ status: 200, description: 'Incident details.' })
  @ApiResponse({ status: 404, description: 'Incident not found.' })
  async get(...) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update incident', description: 'Update incident fields; status transitions validated.' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateIncidentDto })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Invalid status transition or validation error.' })
  async update(...) {}

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge incident', description: 'Transition OPEN → ACKNOWLEDGED.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Invalid transition.' })
  async acknowledge(...) {}

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve incident', description: 'Transition to RESOLVED.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200 })
  async resolve(...) {}

  @Post(':id/close')
  @ApiOperation({ summary: 'Close incident', description: 'Transition to CLOSED.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200 })
  async close(...) {}
}
```

---

## 2. Incident Comments Controller Annotations

```typescript
@ApiTags('Incidents')
@ApiBearerAuth('access-token')
@Controller({ path: 'incidents/:id/comments', version: '1' })
export class IncidentCommentsController {
  @Post()
  @ApiOperation({ summary: 'Add comment to incident', description: 'Append-only; author from token.' })
  @ApiParam({ name: 'id', description: 'Incident UUID' })
  @ApiBody({ type: CreateIncidentCommentDto })
  @ApiResponse({ status: 201, description: 'Comment created.' })
  @ApiResponse({ status: 404, description: 'Incident not found.' })
  async add(...) {}

  @Get()
  @ApiOperation({ summary: 'List comments for incident' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Comments in chronological order.' })
  async list(...) {}
}
```

---

## 3. Tasks Controller Annotations

```typescript
@ApiTags('Tasks')
@ApiBearerAuth('access-token')
@Controller({ path: 'tasks', version: '1' })
export class TasksController {
  @Post()
  @ApiOperation({ summary: 'Create task', description: 'Manual or follow-up from incident/checklist/alert.' })
  @ApiBody({ type: CreateTaskDto })
  @ApiResponse({ status: 201, description: 'Task created.' })
  @ApiResponse({ status: 400, description: 'Validation or scope error.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  async create(...) {}

  @Get()
  @ApiOperation({ summary: 'List tasks', description: 'Filter by location, status, incident, assignee, due date.' })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'zoneId', required: false })
  @ApiQuery({ name: 'incidentId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'] })
  @ApiQuery({ name: 'assignedToId', required: false })
  @ApiQuery({ name: 'dueBefore', required: false })
  @ApiQuery({ name: 'dueAfter', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of tasks.' })
  async list(...) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async get(...) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update task', description: 'Fields and/or status; transitions validated.' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateTaskDto })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Invalid status transition.' })
  async update(...) {}

  @Post(':id/start')
  @ApiOperation({ summary: 'Start task', description: 'Transition OPEN → IN_PROGRESS.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200 })
  async start(...) {}

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete task', description: 'Transition to COMPLETED.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200 })
  async complete(...) {}

  @Post(':id/close')
  @ApiOperation({ summary: 'Close task', description: 'Transition to CLOSED.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200 })
  async close(...) {}
}
```

---

## 4. DTOs with Swagger decorators (example)

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIncidentDto {
  @ApiProperty()
  organizationId: string;

  @ApiPropertyOptional()
  brandId?: string;

  @ApiProperty()
  locationId: string;

  @ApiPropertyOptional()
  zoneId?: string;

  @ApiPropertyOptional()
  assetId?: string;

  @ApiPropertyOptional()
  checklistRunId?: string;

  @ApiPropertyOptional()
  checklistRunResponseId?: string;

  @ApiProperty({ enum: ['HYGIENE', 'EQUIPMENT', 'SAFETY', 'FOOD_QUALITY', 'OTHER'] })
  category: string;

  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  severity: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  rootCause?: string;

  @ApiPropertyOptional()
  immediateAction?: string;
}

export class CreateIncidentCommentDto {
  @ApiProperty({ description: 'Comment body' })
  body: string;
}

export class CreateTaskDto {
  @ApiProperty()
  organizationId: string;

  @ApiPropertyOptional()
  brandId?: string;

  @ApiProperty()
  locationId: string;

  @ApiPropertyOptional()
  zoneId?: string;

  @ApiPropertyOptional()
  incidentId?: string;

  @ApiProperty({ enum: ['MANUAL', 'INCIDENT', 'CHECKLIST_FAILURE', 'ALERT_EVENT'] })
  sourceType: string;

  @ApiPropertyOptional()
  sourceId?: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  category?: string;

  @ApiPropertyOptional({ enum: ['USER', 'TEAM', 'ROLE'] })
  assignedToType?: string;

  @ApiPropertyOptional()
  assignedToId?: string;

  @ApiPropertyOptional()
  dueAt?: string;

  @ApiPropertyOptional()
  slaMinutes?: number;
}
```
