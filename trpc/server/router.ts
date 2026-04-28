import { router } from "./init";
import { candidatesRouter } from "./routers/candidates";
import { workspacesRouter } from "./routers/workspaces";

export const appRouter = router({
  candidates: candidatesRouter,
  workspaces: workspacesRouter,
});

export type AppRouter = typeof appRouter;
