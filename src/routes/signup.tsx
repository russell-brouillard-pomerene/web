import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import { FcGoogle } from "react-icons/fc";
import { jwtDecode } from "jwt-decode";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { getExtendedEphemeralPublicKey, jwtToAddress } from "@mysten/zklogin";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "@/firebase-config";

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters long",
  }),
});

export default function Signup() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login, googleSignIn } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setSubmitting(true);
    try {
      const userCreateResp = await fetch(
        `${import.meta.env.VITE_API_URL}/user/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
          }),
        }
      );

      if (!userCreateResp.ok) {
        toast({
          title: "Error creating account",
          description: "An error occurred while creating your account",
        });
        return;
      }

      await login(values.email, values.password);

      navigate("/items");
    } catch (error) {
      if (error instanceof Error) {
        const errorMessage = error.message;
        toast({
          title: "Error creating account",
          description: errorMessage,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setSubmitting(true);
    try {

      console.log("TEST")
      googleSignIn();
    } catch (error) {
      if (error instanceof Error) {
        const errorMessage = error.message;
        toast({
          title: "Error signing in with Google",
          description: errorMessage,
        });
      }
    }
  }

  useEffect(() => {
    const handleRedirect = async () => {
      const hash = window.location.hash;
      if (hash.includes("id_token")) {
        const idToken = new URLSearchParams(hash.substring(1)).get("id_token");

        console.log(idToken);
        if (idToken) {
          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);
          await zkLogin(idToken);
          // Navigate to a protected route or home page after successful sign-in
        }
      }
    };

    handleRedirect();
  }, []);

  async function zkLogin(jwt: string) {
    const res = {
      salt: "1234567890",
    };
    const userSalt = BigInt(res.salt);

    // decode the JWT
    const jwtPayload = jwtDecode(jwt);

    console.log(jwtPayload);
    if (!jwtPayload.sub || !jwtPayload.aud) {
      console.warn("[completeZkLogin] missing jwt.sub or jwt.aud");
      return;
    }

    const userAddr = jwtToAddress(jwt, res.salt);

    const setupData = JSON.parse(sessionStorage.getItem("setupDataKey")!);

    const ephemeralKeyPair = keypairFromSecretKey(
      setupData.ephemeralPrivateKey
    );

    const partialZkLoginSignature = await fetch(
      "https://prover-dev.mystenlabs.com/v1",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          {
            maxEpoch: setupData.maxEpoch,
            jwtRandomness: setupData.randomness,
            extendedEphemeralPublicKey: getExtendedEphemeralPublicKey(
              ephemeralKeyPair.getPublicKey()
            ),
            jwt,
            salt: userSalt.toString(),
            keyClaimName: "sub",
          },
          null,
          2
        ),
      }
    )
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
      });

    if (!partialZkLoginSignature) {
      return;
    }

    sessionStorage.setItem(
      "zklogin-account",
      JSON.stringify({
        provider: setupData.provider,
        userAddr,
        partialZkLoginSignature,
        ephemeralPrivateKey: setupData.ephemeralPrivateKey,
        userSalt: userSalt.toString(),
        sub: jwtPayload.sub,
        aud: jwtPayload.aud,
        maxEpoch: setupData.maxEpoch,
      })
    );

    navigate("/items");
  }

  function keypairFromSecretKey(privateKeyBase64: string): Ed25519Keypair {
    const keyPair = decodeSuiPrivateKey(privateKeyBase64);
    return Ed25519Keypair.fromSecretKey(keyPair.secretKey);
  }

  return (
    <div className="w-100 h-screen">
      <div className="container relative h-full flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <Link
          to="/"
          className="lg:hidden absolute left-4 top-4 md:left-8 md:top-8 z-10"
        >
          <img
            src="/white-small.png"
            alt="Pomerene"
            className="rounded-full h-10"
          />
        </Link>
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
          <div className="absolute inset-0 bg-green-100" />
          <div className="relative z-20 flex items-center text-lg font-medium">
            <Link to="/" className="flex items-center justify-center">
              <img
                src="/white-small.png"
                alt="Pomerene"
                className="rounded-full h-10"
              />
            </Link>
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg text-black">
                A smart network for international trade
              </p>
            </blockquote>
          </div>
        </div>
        <div className="lg:p-8 pt-20">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Sign in to your account
              </h1>
            </div>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  disabled={submitting}
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Submit
                </Button>

                <div className="relative">
                  <div
                    className="absolute inset-0 flex items-center"
                    aria-hidden="true"
                  >
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-white text-lg font-medium text-gray-900">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleGoogleSignIn}
                  disabled={submitting}
                  className={`w-full border border-gray-300 flex items-center justify-center py-2 px-4 rounded-md shadow-sm transition-colors duration-200 ${
                    submitting
                      ? "bg-gray-600 hover:bg-gray-700 text-white"
                      : "bg-white hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FcGoogle className="mr-2 h-5 w-5" />
                  )}
                  Google
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
