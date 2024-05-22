export type ItemType = {
  location: string;
  objectId: string;
  description:string;

};

export interface TransactionData {
  blockTime: number;
  confirmationStatus: string;
  err: null;
  memo: string;
  signature: string;
  slot: number;
}
