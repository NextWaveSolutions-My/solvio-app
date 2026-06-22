import { ObjectId } from "mongodb";

export interface NewsletterSubscriber {
  _id?: ObjectId;
  email: string;
  subscribedAt: Date;
  status: "subscribed" | "unsubscribed";
}
