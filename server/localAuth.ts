import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { UserRepository } from "./repositories";
import { comparePassword, validateEmail, validatePassword } from "./passwordUtils";

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
        
        if (!user) {
          return done(null, false, { message: GENERIC });
        }

        if (!user.password || typeof user.password !== 'string') {
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
