import { createContext, ReactNode, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/firebase-config"; // Ensure this is correctly pointing to your Firebase configuration
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { generateNonce, generateRandomness } from "@mysten/zklogin";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";

const MAX_EPOCH = 2; // keep ephemeral keys active for this many Sui epochs from now (1 epoch ~= 24h)

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
  googleSignIn: () => Promise<void>;
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
  // Initialize selectedScanner from localStorage
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

    return unsubscribe; // Cleanup subscription
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  // const googleSignIn = async () => {
  //   const provider = new GoogleAuthProvider();
  //   await signInWithPopup(auth, provider);
  // };

  const googleSignIn = async () => {
    console.log("TEST");
    // const provider = new GoogleAuthProvider();
    const { epoch } = await suiClient.getLatestSuiSystemState();
    const maxEpoch = Number(epoch) + MAX_EPOCH; // the ephemeral key will be valid for MAX_EPOCH from now
    const ephemeralKeyPair = new Ed25519Keypair();
    const randomness = generateRandomness();
    const nonce = generateNonce(
      ephemeralKeyPair.getPublicKey(),
      maxEpoch,
      randomness
    );

    // Set the nonce in session storage to validate it later
    sessionStorage.setItem(
      "setupDataKey",
      JSON.stringify({
        provider: "Google",
        maxEpoch,
        randomness: randomness.toString(),
        ephemeralPrivateKey: ephemeralKeyPair.getSecretKey(),
      })
    );

    const clientId = import.meta.env.VITE_FIREBASE_AUTH_GOOGLE_CLIENT_ID || "";

    // Construct the OAuth URL manually
    const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    oauthUrl.searchParams.set("client_id", clientId);
    oauthUrl.searchParams.set(
      "redirect_uri",
      `${window.location.origin}/signup`
    );
    oauthUrl.searchParams.set("response_type", "id_token");
    oauthUrl.searchParams.set("scope", "openid");
    oauthUrl.searchParams.set("nonce", nonce);

    console.log(oauthUrl);

    // Redirect to the OAuth URL
    window.location.replace(oauthUrl.toString());
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
