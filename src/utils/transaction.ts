import { genAddressSeed, getZkLoginSignature } from "@mysten/zklogin";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { suiClient } from "@/contexts/suiClient";
import { ItemType } from "@/types/itemTypes";

interface Account {
  userAddr: string;
  ephemeralPrivateKey: string;
  userSalt: string;
  sub: string;
  aud: string;
  partialZkLoginSignature: any;
  maxEpoch: number;
}

function getAccountData(): Account | null {
  const accountData = sessionStorage.getItem("zklogin-account");
  if (!accountData) {
    console.error("No account data found in sessionStorage.");
    return null;
  }
  return JSON.parse(accountData);
}

async function createTransaction(txb: TransactionBlock) {
  const account = getAccountData();
  if (!account) {
    return;
  }

  txb.setSender(account.userAddr);

  console.log("Public Address:", account.userAddr);

  const ephemeralKeyPair = keypairFromSecretKey(account.ephemeralPrivateKey);

  const { bytes, signature: userSignature } = await txb.sign({
    client: suiClient,
    signer: ephemeralKeyPair,
  });

  const addressSeed = genAddressSeed(
    BigInt(account.userSalt),
    "sub",
    account.sub,
    account.aud
  ).toString();

  console.log("Address Seed:", addressSeed);

  const zkLoginSignature = getZkLoginSignature({
    inputs: {
      ...account.partialZkLoginSignature,
      addressSeed,
    },
    maxEpoch: account.maxEpoch,
    userSignature,
  });

  console.log("ZK Login Signature:", zkLoginSignature);

  try {
    const result = await suiClient.executeTransactionBlock({
      transactionBlock: bytes,
      signature: zkLoginSignature,
    });
    console.log("Transaction Result:", result);
  } catch (error: any) {
    console.error("Transaction Execution Error:", error);

    throw Error(error);
  }
}

export async function createItem(
  description: string,
  location: string,
  data: string
) {
  const txb = new TransactionBlock();
  txb.moveCall({
    target:
      "0x79c524b2a67b08bbfade1f4c80b6c26b43aa7040584a5e518094d3b671028d7b::pomerene::register_pallet",
    arguments: [
      txb.pure.string(description),
      txb.pure.string(location),
      txb.pure.string(data),
    ],
  });

  await createTransaction(txb);
}

export async function createScanner(description: string, location: string) {
  const txb = new TransactionBlock();
  txb.moveCall({
    target:
      "0x79c524b2a67b08bbfade1f4c80b6c26b43aa7040584a5e518094d3b671028d7b::pomerene::register_scanner",
    arguments: [txb.pure.string(description), txb.pure.string(location)],
  });

  await createTransaction(txb);
}

export async function getItems(): Promise<ItemType[] | null[]> {
  try {
    const account = getAccountData();
    if (!account || !account.userAddr) return [];

    console.log("Account:", account);

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

    const ids: string[] = objectsResponse.data
      .map((object) => object.data?.objectId)
      .filter((id) => id);
    if (ids && ids.length === 0) {
      console.log("No object IDs found.");
      return [];
    }

    console.log("IDS ", ids);

    const txns = await suiClient.multiGetObjects({
      ids,
      options: { showType: true, showContent: true },
    });

    const items = txns
      .map((txn: any) => {
        if (txn.data?.content) {
          const content: any = txn.data?.content;
          console.log(content);
          return {
            objectId: content.fields.id.id,
            description: content.fields.description,
            location: content.fields.location,
          };
        } else {
          return null;
        }
      })
      .filter((item) => item !== null);

    console.log("items ", items);

    return items;
  } catch (error) {
    console.error("Error fetching items:", error);
    return [];
  }
}

export async function getObject(id: string) {
  const obj = await suiClient.getObject({
    id:"0x213503d4836ab8cae56f07920039422a06d73396bec79437af2abd71cada79dd",
  });

  return obj;
}

export async function getObjectTranactions(id:string) {
  const transaction = await suiClient.queryTransactionBlocks({
    
  });

  return transaction;
}

function keypairFromSecretKey(privateKeyBase64: string): Ed25519Keypair {
  const keyPair = decodeSuiPrivateKey(privateKeyBase64);
  return Ed25519Keypair.fromSecretKey(keyPair.secretKey);
}
