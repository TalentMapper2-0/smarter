import { router } from "./init";
import { chatsRouter } from "./routers/chats";
import { candidatesRouter } from "./routers/candidates";
import { workspacesRouter } from "./routers/workspaces";

export const appRouter = router({
  chat: chatsRouter,
  candidates: candidatesRouter,
  workspaces: workspacesRouter,
});

export type AppRouter = typeof appRouter;
