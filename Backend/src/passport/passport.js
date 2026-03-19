import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import userModel from "../models/user.model.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // check if user already exists with this google id
        let user = await userModel.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        // check if email already registered normally
        const existingUser = await userModel.findOne({
          email: profile.emails[0].value,
        });

        if (existingUser) {
          // link google id to existing account
          existingUser.googleId = profile.id;
          existingUser.isEmailVerified = true;
          await existingUser.save();
          return done(null, existingUser);
        }

        // create new user
        const newUser = await userModel.create({
          username: profile.displayName.replace(/\s+/g, "").toLowerCase(),
          email: profile.emails[0].value,
          googleId: profile.id,
          isEmailVerified: true, // google already verified it
          role: "customer",
        });

        return done(null, newUser);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;