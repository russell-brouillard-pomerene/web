import { genAddressSeed, getZkLoginSignature } from "@mysten/zklogin";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import {
  SerializedSignature,
  decodeSuiPrivateKey,
} from "@mysten/sui.js/cryptography";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { suiClient } from "@/contexts/suiClient";
import { MIST_PER_SUI } from "@mysten/sui.js/utils";

export async function createItem() {
  const account = JSON.parse(sessionStorage.getItem("zklogin-account") || "{}");

  console.log("Account:", account);

  const txb = new TransactionBlock();

  const [coin] = txb.splitCoins(txb.gas, [MIST_PER_SUI * 1n]);
  txb.transferObjects(
    [coin],
    "0xfa0f8542f256e669694624aa3ee7bfbde5af54641646a3a05924cf9e329a8a36"
  );
  txb.setSender(account.userAddr);

  console.log("Public Address:", account.userAddr);

  const ephemeralKeyPair = keypairFromSecretKey(account.ephemeralPrivateKey);

  const { bytes, signature: userSignature } = await txb.sign({
    client: suiClient,
    signer: ephemeralKeyPair,
  });

  // Generate addressSeed using userSalt, sub, and aud (JWT Payload)
  const addressSeed = genAddressSeed(
    BigInt(account.userSalt),
    "sub",
    account.sub,
    account.aud
  ).toString();

  console.log("Address Seed:", addressSeed);

  // Generate zkLoginSignature
  const zkLoginSignature = getZkLoginSignature({
    inputs: {
      ...account.partialZkLoginSignature,
      addressSeed,
    },
    maxEpoch: account.maxEpoch,
    userSignature,
  });

  console.log("ZK Login Signature:", zkLoginSignature);

  // Execute transaction
  try {
    const result = await suiClient.executeTransactionBlock({
      transactionBlock: bytes,
      signature: zkLoginSignature,
    });
    console.log("Transaction Result:", result);
  } catch (error) {
    console.error("Transaction Execution Error:", error);
  }
}

function keypairFromSecretKey(privateKeyBase64: string): Ed25519Keypair {
  const keyPair = decodeSuiPrivateKey(privateKeyBase64);
  return Ed25519Keypair.fromSecretKey(keyPair.secretKey);
}
