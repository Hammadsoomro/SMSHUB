import serverless from "serverless-http";
import { createServer } from "../../server";

let app: any;

export const handler = async (event: any, context: any) => {
  if (!app) {
    app = await createServer();
  }
  return serverless(app)(event, context);
};
