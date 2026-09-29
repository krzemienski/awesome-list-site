import { Container, getContainer } from "@cloudflare/containers";

// Runs the production Docker image behind cf.awesome.video against the shared
// production database. The primary deployment owns the schedulers, so this
// instance starts with DISABLE_BACKGROUND_JOBS=1, and PUBLIC_SITE_URL keeps
// canonical URLs on the apex.

interface Env {
  APP: DurableObjectNamespace<AwesomeVideoApp>;
  // Every secret uploaded from the app's .env is forwarded to the container.
  [secret: string]: unknown;
}

export class AwesomeVideoApp extends Container<Env> {
  defaultPort = 5000;
  sleepAfter = "1h";
  enableInternet = true;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const secrets: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === "string") secrets[key] = value;
    }
    this.envVars = {
      ...secrets,
      NODE_ENV: "production",
      PORT: "5000",
      DISABLE_BACKGROUND_JOBS: "1",
      PUBLIC_SITE_URL: "https://awesome.video",
    };
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return getContainer(env.APP).fetch(request);
  },
};
