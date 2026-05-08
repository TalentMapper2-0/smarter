import { router } from "./init";
import { candidatesRouter } from "./routers/candidates";
import { chatsRouter } from "./routers/chats";

export const appRouter = router({
  chat: chatsRouter,
  candidates: candidatesRouter,
});

export type AppRouter = typeof appRouter;
