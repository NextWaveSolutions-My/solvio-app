declare module "web-push" {
  export type PushSubscription = {
    endpoint: string;
    expirationTime?: number | null;
    keys?: {
      p256dh: string;
      auth: string;
    };
  };

  export type RequestOptions = {
    TTL?: number;
    headers?: Record<string, string>;
  };

  export type SendResult = {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  };

  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;

  export function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer | null,
    options?: RequestOptions
  ): Promise<SendResult>;

  const webpush: {
    setVapidDetails: typeof setVapidDetails;
    sendNotification: typeof sendNotification;
  };

  export default webpush;
}
