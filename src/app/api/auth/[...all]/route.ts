import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/modules/bersama/auth";

export const { GET, POST } = toNextJsHandler(auth);
