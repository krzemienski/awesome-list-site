import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import { comparePassword, validateEmail, validatePassword } from "./passwordUtils";

export function setupLocalAuth() {
  passport.use('local', new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        if (!validateEmail(email)) {
          return done(null, false, { message: 'Invalid email format' });
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
          return done(null, false, { message: passwordValidation.error || 'Invalid password' });
        }

        const user = await storage.getUserByEmail(email);
        
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (!user.password || typeof user.password !== 'string') {
          return done(null, false, { message: 'This account uses OAuth. Please login with your OAuth provider.' });
        }

        const isValidPassword = await comparePassword(password, user.password as string);
        
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        const userSession = {
          claims: {
            sub: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            profile_image_url: user.profileImageUrl,
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
