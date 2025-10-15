export class TaskSummaryResult {
  id: string;
  status_code: number;
  status_message: string;
  // plus whatever “result” fields come back
  // you can type more precisely based on DataForSEO docs
  result: any;
}

export class SummaryResponseDto {
  version: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: TaskSummaryResult[];
}

// dto/tasks-ready-response.dto.ts
export class TaskReadyItem {
  id: string;
  // plus other fields from tasks_ready “result” array
  // e.g. .result -> array of { id, etc. }
  result: { id: string }[];
}

export class TasksReadyResponseDto {
  version: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: TaskReadyItem[];
}
