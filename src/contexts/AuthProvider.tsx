import { createContext, ReactNode, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/firebase-config"; // Ensure this is correctly pointing to your Firebase configuration
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { generateNonce, generateRandomness } from "@mysten/zklogin";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";

const MAX_EPOCH = 2; // Keep ephemeral keys active for this many Sui epochs from now (1 epoch ~= 24h)

const suiClient = new SuiClient({
  url: getFullnodeUrl("devnet"),
});

export interface ScannerInfo {
  description: string;
  secretKey: string;
}

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  googleSignIn: () => void;
  selectedScanner: ScannerInfo | null;
  setSelectedScanner: (scanner: ScannerInfo | null) => void;
  location: string;
  setLocation: (location: string) => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

const SCANNER_STORAGE_KEY = "selectedScanner";

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedScanner, setSelectedScanner] = useState<ScannerInfo | null>(
    () => {
      const storedScanner = localStorage.getItem(SCANNER_STORAGE_KEY);
      return storedScanner ? JSON.parse(storedScanner) : null;
    }
  );
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const googleSignIn = async () => {
    try {
      const { epoch } = await suiClient.getLatestSuiSystemState();
      const maxEpoch = Number(epoch) + MAX_EPOCH;
      const ephemeralKeyPair = new Ed25519Keypair();
      const randomness = generateRandomness();
      const nonce = generateNonce(
        ephemeralKeyPair.getPublicKey(),
        maxEpoch,
        randomness
      );

      const clientId =
        "844147711427-tc63nlmppukb8jqop92jdvrbf3ubcdkg.apps.googleusercontent.com";
      const redirectUri = "http://localhost:5173/signup"; // Should be the URL of your app
      const scope = "openid email profile";
      const responseType = "id_token";

      const authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=${responseType}&scope=${encodeURIComponent(
        scope
      )}&nonce=${nonce}`;

      sessionStorage.setItem(
        "setupDataKey",
        JSON.stringify({
          maxEpoch,
          randomness: randomness.toString(),
          ephemeralPrivateKey: ephemeralKeyPair.getSecretKey(),
        })
      );

      console.log("Authorization URL:", authorizationUrl);

      // Redirect to the authorization URL
      window.location.href = authorizationUrl;
    } catch (error) {
      console.error("Error during Google sign-in:", error);
    }
  };

  const handleSetSelectedScanner = (scanner: ScannerInfo | null) => {
    setSelectedScanner(scanner);
    localStorage.setItem(SCANNER_STORAGE_KEY, JSON.stringify(scanner));
  };

  const value = {
    currentUser,
    setCurrentUser,
    login,
    logout,
    googleSignIn,
    selectedScanner,
    setSelectedScanner: handleSetSelectedScanner,
    location,
    setLocation,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
