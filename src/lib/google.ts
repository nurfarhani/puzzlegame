// Sign in with Google, using @react-native-google-signin/google-signin.
//
// It only works in an installed build of the app (npx expo run:android or an
// EAS build) with an Android OAuth client set up in Google Cloud; see the
// README. Expo Go doesn't include the native part, so there googleAvailable()
// is false and the library is never loaded.
//
// We only ask for the basic profile (name and email). Nothing is sent to a
// server of ours: the Google account just tells us which player is signing in.

import { TurboModuleRegistry } from 'react-native';

export type GoogleUser = {
  id: string;
  email: string;
  name: string; // first name if Google has one
};

export type GoogleResult =
  | { ok: true; user: GoogleUser }
  | { ok: false; reason: 'cancelled' | 'unavailable' | 'error'; message?: string };

export const googleAvailable = (): boolean => TurboModuleRegistry.get('RNGoogleSignin') != null;

let configured = false;

const library = async () => {
  const lib = await import('@react-native-google-signin/google-signin');
  if (!configured) {
    lib.GoogleSignin.configure({});
    configured = true;
  }
  return lib;
};

// Android's error code when the app's package name or SHA-1 isn't registered
// in Google Cloud.
const DEVELOPER_ERROR = '10';

export const signInWithGoogle = async (): Promise<GoogleResult> => {
  if (!googleAvailable()) return { ok: false, reason: 'unavailable' };
  try {
    const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = await library();
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Forget the last Google account first, so the account chooser always
      // opens and each person on a shared phone can pick their own.
      await GoogleSignin.signOut().catch(() => null);
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return { ok: false, reason: 'cancelled' };
      const { id, email, givenName, name } = response.data.user;
      return { ok: true, user: { id, email, name: givenName || name || email.split('@')[0] } };
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS) {
          return { ok: false, reason: 'cancelled' };
        }
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          return { ok: false, reason: 'error', message: 'Google Play services are missing or out of date.' };
        }
        if (String(error.code) === DEVELOPER_ERROR) {
          return {
            ok: false,
            reason: 'error',
            message:
              "Google sign-in isn't set up for this app yet. Add an Android OAuth client with this app's package name and SHA-1 in Google Cloud (see the README).",
          };
        }
      }
      throw error;
    }
  } catch (error) {
    return { ok: false, reason: 'error', message: error instanceof Error ? error.message : String(error) };
  }
};

export const signOutOfGoogle = async (): Promise<void> => {
  if (!googleAvailable()) return;
  try {
    const { GoogleSignin } = await library();
    await GoogleSignin.signOut();
  } catch {
    // Already signed out, or no connection: nothing else to do.
  }
};
