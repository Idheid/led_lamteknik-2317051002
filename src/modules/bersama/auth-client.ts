import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { ac, peranAkses } from "@/modules/bersama/peran";

export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles: peranAkses })],
});
