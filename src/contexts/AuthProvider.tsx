import { createContext, ReactNode, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  UserCredential,
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
  googleSignIn: () => Promise<{ idToken: string | null; user: User }>;
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
    const provider = new GoogleAuthProvider();
    const { epoch } = await suiClient.getLatestSuiSystemState();
    const maxEpoch = Number(epoch) + MAX_EPOCH;
    const ephemeralKeyPair = new Ed25519Keypair();
    const randomness = generateRandomness();
    const nonce = generateNonce(
      ephemeralKeyPair.getPublicKey(),
      maxEpoch,
      randomness
    );

    sessionStorage.setItem(
      "setupDataKey",
      JSON.stringify({
        provider: "Google",
        maxEpoch,
        randomness: randomness.toString(),
        ephemeralPrivateKey: ephemeralKeyPair.getSecretKey(),
      })
    );

    provider.setCustomParameters({ nonce });

    const result: UserCredential = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const idToken = credential?.idToken ?? null;

    return { idToken, user: result.user };
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
