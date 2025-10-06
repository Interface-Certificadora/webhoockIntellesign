export class CreateWebhookDto {
  uuid: string;
  created_at: string;
  event_type: string;
  summary: string;
  resource_type: string;
  resource: {
    uuid: string;
    created_at: string;
    updated_at: string;
    status: string;
  };
  event_version: string;
  resource_version: string;

}
