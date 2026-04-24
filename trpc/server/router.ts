import { router } from "./init";
import { candidatesRouter } from "./routers/candidates";

export const appRouter = router({
  candidates: candidatesRouter,
});

export type AppRouter = typeof appRouter;
