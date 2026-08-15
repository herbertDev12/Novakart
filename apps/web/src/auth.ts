import NextAuth, { type NextAuthResult } from "next-auth";

// Auth.js v5 (next-auth@5, still tagged "beta" upstream but actively maintained
// and the only line that supports Next.js 16 / React 19 natively). Pinned as an
// exact version in package.json, per WEB_ARCHITECTURE §2: pin one major version
// and never mix v4/v5 APIs in the same repo.
//
// Each export below carries an explicit indexed-access annotation
// (NextAuthResult["signIn"], etc). Without it, tsc fails with TS2742 ("inferred
// type of 'signIn' cannot be named ... likely not portable") — `signIn`'s real
// signature is generic over an unexported @auth/core provider-id type, so TS
// cannot print it standalone once destructured into a module export. Indexing
// into the already-public NextAuthResult interface gives TS a nameable type
// without needing to print the underlying generic signature at all.
const nextAuth = NextAuth({
  providers: [],
  session: {
    strategy: "jwt",
  },
});

export const handlers: NextAuthResult["handlers"] = nextAuth.handlers;
export const auth: NextAuthResult["auth"] = nextAuth.auth;
export const signIn: NextAuthResult["signIn"] = nextAuth.signIn;
export const signOut: NextAuthResult["signOut"] = nextAuth.signOut;
