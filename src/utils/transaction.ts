import { genAddressSeed, getZkLoginSignature } from "@mysten/zklogin";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { suiClient } from "@/contexts/suiClient";

export async function createItem() {
  const account = JSON.parse(sessionStorage.getItem("zklogin-account") || "{}");

  console.log("Account:", account);

  const txb = new TransactionBlock();

  txb.moveCall({
    target: `0xe45a03b19ae437f7855813e05a28ba68c4cf17076dad891d89084b03ed40c9ce::pomerene::register_pallet`,
    arguments: [
      txb.pure.string("pallet1"),
      txb.pure.string("my location russell"),
    ],
  });

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

export async function getItems() {
  try {
    const accountData = sessionStorage.getItem("zklogin-account");
    if (!accountData) {
      console.error("No account data found in sessionStorage.");
      return [];
    }

    const account = JSON.parse(accountData);
    console.log("Account:", account);

    if (!account.userAddr) {
      console.error("User address is missing in the account data.");
      return [];
    }

    const objectsResponse = await suiClient.getOwnedObjects({
      owner: account.userAddr,
    });
    console.log("Objects:", JSON.stringify(objectsResponse));

    if (!objectsResponse || !objectsResponse.data) {
      console.error(
        "No objects found or invalid response from getOwnedObjects."
      );
      return [];
    }

    const ids = objectsResponse.data
      .map((object) => object.data?.objectId)
      .filter((id) => id);
    if (ids.length === 0) {
      console.log("No object IDs found.");
      return [];
    }

    const txns = await suiClient.multiGetObjects({
      ids,
      options: { showType: true, showContent: true },
    });

    const items = txns
      .map((txn) => {
        const fields = txn.data?.content?.fields;

        if (!fields.location) {
          return null;
        }

        return fields
          ? {
              objectId: fields.id.id,
              description: fields.description,
              location: fields.location,
            }
          : null;
      })
      .filter((item) => item !== null);

    return items;
  } catch (error) {
    console.error("Error fetching items:", error);
    return [];
  }
}

function keypairFromSecretKey(privateKeyBase64: string): Ed25519Keypair {
  const keyPair = decodeSuiPrivateKey(privateKeyBase64);
  return Ed25519Keypair.fromSecretKey(keyPair.secretKey);
}
