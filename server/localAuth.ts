import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { UserRepository } from "./repositories";
import { comparePassword, validateEmail, validatePassword } from "./passwordUtils";

// BUG-030 (run14): pre-computed bcrypt hash (cost 10) used to equalize timing
// on the unknown-email path. Never matches any real password.
const DUMMY_BCRYPT_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMye/Ci/xKxwj1lQxLl1dW6NDrqzS3lgkhW';

export function setupLocalAuth() {
  const userRepo = new UserRepository();

  passport.use('local', new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        // R3-M25: every failure path returns the SAME generic message. Field-format
        // hints ("password must be at least 8 characters", "invalid email format")
        // and the OAuth-account hint let probes distinguish failure causes — the
        // register/reset flows keep their specific validation messages, login does not.
        const GENERIC = 'Invalid email or password';

        if (!validateEmail(email)) {
          return done(null, false, { message: GENERIC });
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
          return done(null, false, { message: GENERIC });
        }

        const user = await userRepo.getUserByEmail(email);

        // BUG-030 (run14): timing oracle — the no-user / OAuth-only paths used
        // to return immediately while wrong-password paths paid a full bcrypt
        // compare, letting probes distinguish "email exists" by latency. Burn
        // an equivalent bcrypt compare against a fixed dummy hash first.
        if (!user || !user.password || typeof user.password !== 'string') {
          // Real bcrypt hash of a random throwaway string (cost 10, same as ours).
          await comparePassword(password, DUMMY_BCRYPT_HASH);
          // OAuth-only account: still generic — naming the provider would confirm
          // the email exists. The login page offers "Continue with Replit" anyway.
          return done(null, false, { message: GENERIC });
        }

        const isValidPassword = await comparePassword(password, user.password as string);
        
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        const userSession = {
          claims: {
            sub: user.id,
            email: user.email || undefined,
            first_name: user.firstName || undefined,
            last_name: user.lastName || undefined,
            profile_image_url: user.profileImageUrl || undefined,
          },
          expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
        };

        return done(null, userSession);
      } catch (error) {
        return done(error);
      }
    }
  ));
}
